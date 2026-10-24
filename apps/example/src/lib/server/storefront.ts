import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createShopifyRequestContext, createStorefrontClient } from '@shopify/hydrogen';

import { i18n } from '$lib/shop';

const BUYER_IP_HEADERS = ['oxygen-buyer-ip', 'cf-connecting-ip', 'x-forwarded-for'] as const;
const DEVELOPMENT_BUYER_IP = '127.0.0.1';

function requireEnv(name: string, value: string | undefined): string {
	if (!value) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
	return value;
}

/** The customer's IP, which the private Storefront API client must forward. */
export function getBuyerIp(request: Request, clientAddress: string | undefined): string {
	for (const header of BUYER_IP_HEADERS) {
		const ip = request.headers.get(header)?.split(',')[0]?.trim();
		if (ip) return ip;
	}
	return clientAddress || DEVELOPMENT_BUYER_IP;
}

/** Creates the request context and the private Storefront API client for one request. */
export function createRequestStorefront(request: Request, buyerIp: string) {
	const requestContext = createShopifyRequestContext({ request, i18n, buyerIp });
	const storefrontClient = createStorefrontClient({
		type: 'private',
		requestContext,
		config: {
			storeDomain: requireEnv('PUBLIC_STORE_DOMAIN', publicEnv.PUBLIC_STORE_DOMAIN),
			privateStorefrontToken: requireEnv(
				'PRIVATE_STOREFRONT_API_TOKEN',
				env.PRIVATE_STOREFRONT_API_TOKEN
			)
		}
	});
	return { requestContext, storefrontClient };
}
