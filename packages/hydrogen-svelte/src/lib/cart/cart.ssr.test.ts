import { createCartStore, type CartStore } from '@shopify/hydrogen';
import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';

import CartFixture from '../test-utils/cart/CartFixture.svelte';
import { makeCartData, makeLine } from '../test-utils/cart/data.js';
import StoreFixture from '../test-utils/cart/StoreFixture.svelte';

const cart = () => makeCartData([makeLine('line-1', 1, 'Tea'), makeLine('line-2', 2, 'Honey')]);

/** A real cart store whose subscribe and connect are observed. */
function observedStore(): CartStore {
	const real = createCartStore({ initialData: { cart: cart() } });
	return { ...real, connect: vi.fn(real.connect), subscribe: vi.fn(real.subscribe) };
}

// Runs in the node project: `svelte` resolves to its server build and no effects run.
describe('cart SSR', () => {
	it('renders the real cart from initialData', () => {
		const { body } = render(CartFixture, { props: { initialData: { cart: cart() } } });

		expect(body).toContain('Tea');
		expect(body).toContain('Honey');
		expect(body).toMatch(/data-testid="count"[^>]*>3</);
		expect(body).not.toContain('Loading cart');
	});

	it('reads the store without subscribing to or connecting it', () => {
		const store = observedStore();
		const { body } = render(StoreFixture, { props: { store } });

		expect(body).toContain('Honey');
		expect(store.subscribe).not.toHaveBeenCalled();
		expect(store.connect).not.toHaveBeenCalled();
	});

	it('renders forms that work without JavaScript', () => {
		const { body } = render(CartFixture, { props: { initialData: { cart: cart() } } });
		const forms = body.match(/<form[^>]*>/g) ?? [];

		expect(forms).toHaveLength(2);
		for (const form of forms) {
			expect(form).toContain('method="post"');
			expect(form).toContain('action="/api/cart"');
		}
	});

	it('renders the register() attributes as valid HTML', () => {
		const { body } = render(CartFixture, { props: { initialData: { cart: cart() } } });
		const lineId = body.match(/<input[^>]*name="lineId"[^>]*>/)?.[0] ?? '';
		const setButton = body.match(/<button[^>]*value="set"[^>]*>/)?.[0] ?? '';
		const quantity = body.match(/<input[^>]*name="quantity"[^>]*>/)?.[0] ?? '';

		expect(lineId).toContain('value="line-1"');
		expect(lineId).toMatch(/\breadonly\b/i);
		expect(lineId).not.toMatch(/readonly="false"/i);
		expect(setButton).toContain('name="intent"');
		expect(setButton).toContain('type="submit"');
		expect(setButton).toMatch(/\bhidden\b/);
		expect(quantity).toContain('value="1"');
		expect(quantity).toMatch(/inputmode="numeric"/i);
	});

	it('renders an empty, settled cart for a null cart', () => {
		const { body } = render(CartFixture, { props: { initialData: { cart: null } } });
		expect(body).toMatch(/data-testid="count"[^>]*>0</);
		expect(body).not.toContain('Loading cart');
	});

	it('renders the loading state without initialData', () => {
		const { body } = render(CartFixture, { props: {} });
		expect(body).toContain('Loading cart');
	});

	it('isolates the cart between renders', () => {
		const first = render(CartFixture, { props: { initialData: { cart: cart() } } });
		const second = render(CartFixture, { props: { initialData: { cart: null } } });

		expect(first.body).toContain('Honey');
		expect(second.body).not.toContain('Honey');
	});
});
