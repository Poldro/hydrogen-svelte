import { renderShopifyScriptTags } from '@shopify/hydrogen';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import ShopifyScripts from './ShopifyScripts.svelte';

const shop = { shopId: '1', storefrontId: '', myshopifyDomain: 'test.myshopify.com' };

describe('ShopifyScripts SSR', () => {
	it('renders exactly the tags of renderShopifyScriptTags in the head, in order', () => {
		const { head, body } = render(ShopifyScripts, { props: { shop, shopifyAnalytics: false } });

		expect(head).toContain(renderShopifyScriptTags({ shop, shopifyAnalytics: false }).join(''));
		expect(head).toContain('id="shopify-standard-actions"');
		expect(body).not.toContain('<script');
	});

	it('passes the nonce and consent through to the tags', () => {
		const { head } = render(ShopifyScripts, {
			props: { shop, nonce: 'abc', consent: { mode: 'default-banner' } }
		});

		expect(head).toContain('nonce="abc"');
		expect(head).toContain(
			renderShopifyScriptTags({ shop, nonce: 'abc', consent: { mode: 'default-banner' } }).join('')
		);
	});
});
