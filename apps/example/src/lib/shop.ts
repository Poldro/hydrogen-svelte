import { env } from '$env/dynamic/public';
import type { I18nConfig, ShopifyScriptsShop } from '@shopify/hydrogen';

export const i18n = { country: 'IT', language: 'IT' } as const satisfies I18nConfig;

/** The shop identity that ShopifyScripts needs. Safe for the browser: every value is public. */
export function getShop(): ShopifyScriptsShop {
	const { PUBLIC_STORE_DOMAIN, PUBLIC_SHOP_ID } = env;
	if (!PUBLIC_STORE_DOMAIN || !PUBLIC_SHOP_ID) {
		throw new Error('PUBLIC_STORE_DOMAIN and PUBLIC_SHOP_ID must be set. See .env.example.');
	}
	// A Headless channel storefront has no Hydrogen storefront ID; Hydrogen leaves it out.
	return { shopId: PUBLIC_SHOP_ID, storefrontId: '', myshopifyDomain: PUBLIC_STORE_DOMAIN };
}
