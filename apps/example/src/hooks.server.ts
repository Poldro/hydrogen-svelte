import { handleShopifyRedirects, handleShopifyRoutes } from '@shopify/hydrogen';
import type { ShopifyRequestContext } from '@shopify/hydrogen';
import type { Handle } from '@sveltejs/kit';

import { routeTemplates } from '$lib/route-templates';
import { cartHandlers } from '$lib/server/cart-handlers';
import { createRequestStorefront, getBuyerIp } from '$lib/server/storefront';

export const handle: Handle = async ({ event, resolve }) => {
	// Everything below is created per request: nothing request-scoped lives at module level.
	const { requestContext, storefrontClient } = createRequestStorefront(
		event.request,
		getBuyerIp(event.request, safeClientAddress(event))
	);

	// Shopify routes (`/api/cart`, permalinks, proxies) run before the SvelteKit router.
	const shopifyRoute = handleShopifyRoutes({
		request: event.request,
		requestContext,
		storefrontClient,
		routeTemplates,
		handlers: [cartHandlers]
	});
	if (shopifyRoute) return shopifyRoute;

	event.locals.shopifyRequestContext = requestContext;
	event.locals.storefrontClient = storefrontClient;

	const response = await resolve(event);

	if (response.status === 404) {
		const redirect = await handleShopifyRedirects({
			request: event.request,
			routeTemplates,
			storefrontClient
		});
		if (redirect) return redirect;
	}

	return applyResponseHeaders(requestContext, response);
};

function safeClientAddress(event: Parameters<Handle>[0]['event']): string | undefined {
	try {
		return event.getClientAddress();
	} catch {
		// Some adapters can't tell the client address; the buyer IP then falls back to a dev default.
		return undefined;
	}
}

function applyResponseHeaders(
	requestContext: Pick<ShopifyRequestContext, 'applyResponseHeaders'>,
	response: Response
): Response {
	try {
		requestContext.applyResponseHeaders(response.headers);
		return response;
	} catch (error) {
		// Responses from fetch have immutable headers; copy the response and try again.
		if (!(error instanceof TypeError)) throw error;
		const mutable = new Response(response.body, response);
		requestContext.applyResponseHeaders(mutable.headers);
		return mutable;
	}
}
