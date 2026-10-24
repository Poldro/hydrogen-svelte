import { render } from 'vitest-browser-svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const initializeShopifyScripts = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@shopify/hydrogen', async (importOriginal) => ({
	...(await importOriginal<typeof import('@shopify/hydrogen')>()),
	initializeShopifyScripts
}));

const { default: ShopifyScripts } = await import('./ShopifyScripts.svelte');

const shop = { shopId: '1', storefrontId: '', myshopifyDomain: 'test.myshopify.com' };

describe('ShopifyScripts', () => {
	beforeEach(() => initializeShopifyScripts.mockClear());

	it('starts the scripts once on mount with the route, consent and WebMCP options', async () => {
		const navigate = vi.fn();
		const routes = {};
		const consent = { mode: 'default-banner' } as const;
		const { rerender } = render(ShopifyScripts, {
			props: { shop, navigate, routes, consent, shopifyAnalytics: false }
		});

		expect(initializeShopifyScripts).toHaveBeenCalledExactlyOnceWith({
			consent,
			navigate,
			routes,
			webMcp: true
		});
		await rerender({ shop, navigate, routes, consent, shopifyAnalytics: false, webMcp: false });
		expect(initializeShopifyScripts).toHaveBeenCalledOnce();
	});

	it('forwards webMcp: false', () => {
		render(ShopifyScripts, { props: { shop, webMcp: false, shopifyAnalytics: false } });

		expect(initializeShopifyScripts).toHaveBeenCalledWith(expect.objectContaining({ webMcp: false }));
	});
});
