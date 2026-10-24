import { cartHandlers } from '$lib/server/cart-handlers';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, request }) => {
	// Awaited on purpose: a resolved cart lets the server render the real cart and its count.
	const { data } = await cartHandlers.get({ storefrontClient: locals.storefrontClient, request });

	// The HTML now holds this customer's cart, so it must not land in a shared cache.
	// `cartHandlers.get` doesn't mark the page response itself.
	if (data.cart) locals.shopifyRequestContext.markResponseAsPersonalized('server-rendered cart');

	return { cart: data };
};
