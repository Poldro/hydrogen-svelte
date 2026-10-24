import type { ProductInput } from '@shopify/hydrogen';
import { render } from 'svelte/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { configureCartEndpoint } from '../cart/cart.js';
import { makeCartState } from '../test-utils/cart/data.js';
import { createMockCartStore, type MockCartStore } from '../test-utils/cart/mock-store.js';
import { BLUE, makeProduct } from '../test-utils/product/data.js';
import FactoryFixture from '../test-utils/product/FactoryFixture.svelte';
import { createProductComponents } from './product.svelte.js';

const components = createProductComponents<ProductInput>();
let cartStore: MockCartStore;

beforeEach(() => {
	configureCartEndpoint('/api/cart');
	cartStore = createMockCartStore(makeCartState());
});

describe('ProductProvider (server)', () => {
	it('renders the selected variant into a form that works without JavaScript', () => {
		const { body } = render(FactoryFixture, {
			props: { cartStore, components, product: makeProduct(BLUE) }
		});
		expect(body).toMatch(/<form[^>]*method="post"[^>]*action="\/api\/cart"/);
		expect(body).toMatch(/<input[^>]*name="merchandiseId"[^>]*value="v-blue"/);
		expect(body).toMatch(/<input[^>]*name="quantity"[^>]*value="2"/);
		expect(body).toMatch(/<button[^>]*name="Color"[^>]*value="Blue"[^>]*aria-pressed="true"/);
		expect(body).toMatch(/<button[^>]*name="Color"[^>]*value="Red"[^>]*aria-pressed="false"/);
		expect(body).toMatch(/<button[^>]*name="add-to-cart"[^>]*type="submit"/);
		expect(body).not.toMatch(/\son(click|change)=/);
	});

	it('destroys the store after rendering, so no cart subscription leaks across requests', () => {
		render(FactoryFixture, { props: { cartStore, components, product: makeProduct() } });
		expect(cartStore.listenerCount).toBe(0);
	});
});
