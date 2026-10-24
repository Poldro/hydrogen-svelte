import {
	createEmptyCartErrors,
	createEmptyErrorGroup,
	createProductFormStore,
	type CartState,
	type ProductFormStore,
	type ProductInput
} from '@shopify/hydrogen';
import { flushSync, tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { configureCartEndpoint } from '../cart/cart.js';
import { makeCartData, makeCartState, makeLine } from '../test-utils/cart/data.js';
import { createMockCartStore, type MockCartStore } from '../test-utils/cart/mock-store.js';
import { BLUE, makeProduct, RED } from '../test-utils/product/data.js';
import FactoryFixture from '../test-utils/product/FactoryFixture.svelte';
import StandaloneFixture from '../test-utils/product/StandaloneFixture.svelte';
import { createProductComponents, type UseProductFormResult } from './product.svelte.js';

vi.mock('@shopify/hydrogen', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@shopify/hydrogen')>();
	return { ...actual, createProductFormStore: vi.fn(actual.createProductFormStore) };
});

type Form = UseProductFormResult<ProductInput>;

let cartStore: MockCartStore;

function makeStore(product: ProductInput = makeProduct(RED)): ProductFormStore {
	return createProductFormStore(product, cartStore);
}

async function renderStandalone(
	store: ProductFormStore,
	props: Partial<Parameters<typeof StandaloneFixture>[1]> = {}
) {
	let form: Form | undefined;
	const screen = await render(StandaloneFixture, { store, ...props, expose: (f) => (form = f) });
	if (!form) throw new Error('fixture did not expose the form');
	return { screen, form };
}

function colorValue(form: Form, name: string) {
	return form.options.find((o) => o.name === 'Color')?.values.find((v) => v.name === name);
}

/** A submit event dispatched on the rendered product form. */
function submit(screen: Awaited<ReturnType<typeof render>>): SubmitEvent {
	const form = screen.getByTestId('product-form').element() as HTMLFormElement;
	const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
	form.dispatchEvent(event);
	return event;
}

beforeEach(() => {
	vi.clearAllMocks();
	configureCartEndpoint('/api/cart');
	cartStore = createMockCartStore(makeCartState());
});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('useProductForm', () => {
	describe('initial state', () => {
		it("reflects the product's preselected variant", async () => {
			const { form } = await renderStandalone(makeStore());
			expect(form.selectedVariant).toBe(RED);
			expect(colorValue(form, 'Red')?.selected).toBe(true);
			expect(colorValue(form, 'Blue')?.selected).toBe(false);
		});

		it('starts with nothing selected without a preselected variant', async () => {
			const { form } = await renderStandalone(makeStore(makeProduct(null)));
			expect(form.selectedVariant).toBeNull();
			expect(form.options.flatMap((o) => o.values).some((v) => v.selected)).toBe(false);
		});
	});

	describe('selectOption', () => {
		it('resolves a full variant and updates the options', async () => {
			const { form } = await renderStandalone(makeStore());
			const result = form.selectOption('Color', 'Blue');
			expect(result.status).toBe('resolved');
			expect(result.selectedVariant).toBe(BLUE);
			expect(colorValue(form, 'Red')?.selected).toBe(false);
			expect(colorValue(form, 'Blue')?.selected).toBe(true);
			expect(form.selectedVariant).toBe(BLUE);
		});

		it('returns invalid for an unknown option and keeps the options', async () => {
			const { form } = await renderStandalone(makeStore());
			const before = form.options;
			expect(form.selectOption('Size', 'Large').status).toBe('invalid');
			expect(form.options).toBe(before);
		});
	});

	describe('onSelect', () => {
		it('fires on a resolved selection only', async () => {
			const onSelect = vi.fn();
			const { form } = await renderStandalone(makeStore(), { onSelect });
			form.selectOption('Size', 'Large');
			expect(onSelect).not.toHaveBeenCalled();
			form.selectOption('Color', 'Blue');
			expect(onSelect).toHaveBeenCalledOnce();
			expect(onSelect.mock.calls[0]?.[0]).toMatchObject({ status: 'resolved', selectedVariant: BLUE });
		});
	});

	describe('register', () => {
		it('returns option value props with lowercase Svelte event handlers', async () => {
			const { form } = await renderStandalone(makeStore());
			const props = form.register('optionValue', { optionName: 'Color', value: 'Red' });
			expect(Object.keys(props).sort()).toEqual(['name', 'onchange', 'onclick', 'value']);
			expect(props).toMatchObject({ name: 'Color', value: 'Red' });
		});

		it('selects through the option value handlers', async () => {
			const { form } = await renderStandalone(makeStore());
			form.register('optionValue', { optionName: 'Color', value: 'Blue' }).onchange();
			expect(colorValue(form, 'Blue')?.selected).toBe(true);
			form.register('optionValue', { optionName: 'Color', value: 'Red' }).onclick();
			expect(colorValue(form, 'Red')?.selected).toBe(true);
		});

		it('tracks the selected variant in merchandiseId', async () => {
			const { form } = await renderStandalone(makeStore());
			expect(form.register('merchandiseId', {})).toEqual({ name: 'merchandiseId', value: 'v-red' });
			form.selectOption('Color', 'Blue');
			expect(form.register('merchandiseId', {}).value).toBe('v-blue');
		});

		it('submits an empty merchandiseId without a selection', async () => {
			const { form } = await renderStandalone(makeStore(makeProduct(null)));
			expect(form.register('merchandiseId', {}).value).toBe('');
		});

		it('passes the other fields through from the core register', async () => {
			const { form } = await renderStandalone(makeStore());
			expect(form.register('quantity', { value: 3 })).toEqual({ name: 'quantity', value: '3' });
			expect(form.register('quantity', { defaultValue: 2 })).toEqual({
				name: 'quantity',
				defaultValue: '2'
			});
			expect(form.register('attributeValue', { key: 'gift', value: 'yes' })).toEqual({
				name: 'attributes.gift',
				value: 'yes'
			});
			expect(form.register('addToCart', {})).toEqual({ name: 'add-to-cart', type: 'submit' });
		});
	});

	describe('formProps', () => {
		it('renders a POST form to the cart endpoint', async () => {
			const { screen } = await renderStandalone(makeStore());
			const form = screen.getByTestId('product-form');
			await expect.element(form).toHaveAttribute('method', 'post');
			await expect.element(form).toHaveAttribute('action', '/api/cart');
		});

		it('delegates the submission to the store and runs the callbacks in order', async () => {
			const calls: string[] = [];
			const store = makeStore();
			const handleFormSubmit = vi.spyOn(store, 'handleFormSubmit');
			const { screen } = await renderStandalone(store, {
				formOptions: {
					beforeSubmit: () => calls.push('before'),
					afterSubmit: () => calls.push('after')
				}
			});
			const event = submit(screen);
			expect(event.defaultPrevented).toBe(true);
			expect(handleFormSubmit).toHaveBeenCalledWith(event);
			await vi.waitFor(() => expect(calls).toEqual(['before', 'after']));
		});

		it('skips the store when beforeSubmit prevents the default', async () => {
			const store = makeStore();
			const handleFormSubmit = vi.spyOn(store, 'handleFormSubmit');
			const { screen } = await renderStandalone(store, {
				formOptions: { beforeSubmit: (e) => e.preventDefault() }
			});
			submit(screen);
			expect(handleFormSubmit).not.toHaveBeenCalled();
		});

		it('skips afterSubmit when the submission fails', async () => {
			const afterSubmit = vi.fn();
			const store = makeStore();
			vi.spyOn(store, 'handleFormSubmit').mockRejectedValue(new Error('boom'));
			const { screen, form } = await renderStandalone(store, { formOptions: { afterSubmit } });
			submit(screen);
			await vi.waitFor(() => expect(form.pending.current).toBe(false));
			expect(afterSubmit).not.toHaveBeenCalled();
		});
	});

	describe('pending', () => {
		it('is true while the submission is in flight', async () => {
			let resolve!: () => void;
			const store = makeStore();
			vi.spyOn(store, 'handleFormSubmit').mockReturnValue(new Promise((r) => (resolve = r)));
			const { screen, form } = await renderStandalone(store);
			expect(form.pending.current).toBe(false);
			submit(screen);
			expect(form.pending.current).toBe(true);
			await expect.element(screen.getByTestId('pending')).toHaveTextContent('true');
			resolve();
			await expect.element(screen.getByTestId('pending')).toHaveTextContent('false');
		});
	});

	describe('cart-derived state', () => {
		it('reflects cart errors', async () => {
			const { form } = await renderStandalone(makeStore());
			expect(form.errors.userErrors).toEqual([]);
			const userErrors = [{ code: 'INVALID', field: ['quantity'], message: 'Bad quantity' }];
			cartStore.setState(
				makeCartState({ errors: { ...createEmptyCartErrors(), cart: { ...createEmptyErrorGroup(), userErrors } } } as Partial<CartState>)
			);
			expect(form.errors.userErrors).toEqual(userErrors);
		});

		it('matches the cart line of the selected variant', async () => {
			const { form } = await renderStandalone(makeStore());
			expect(form.matchedLineItem).toBeNull();
			const line = { ...makeLine('line-red', 1, 'Shirt'), merchandise: { id: 'v-red', product: { title: 'Shirt' } } };
			cartStore.setState(makeCartState({ data: makeCartData([line]) }));
			expect(form.matchedLineItem?.id).toBe('line-red');
		});
	});

	describe('template reactivity', () => {
		it('updates aria-pressed and the hidden input after a click', async () => {
			const { screen } = await renderStandalone(makeStore());
			const blue = screen.getByRole('button', { name: 'Blue' });
			await expect.element(blue).toHaveAttribute('aria-pressed', 'false');
			await blue.click();
			await expect.element(blue).toHaveAttribute('aria-pressed', 'true');
			await expect.element(screen.getByTestId('merchandise-id')).toHaveValue('v-blue');
		});

		it('renders the quantity defaultValue', async () => {
			const { screen } = await renderStandalone(makeStore());
			await expect.element(screen.getByTestId('quantity')).toHaveValue(2);
		});
	});
});

describe('createProductComponents', () => {
	const components = createProductComponents<ProductInput>();

	async function renderFactory(props: Partial<Parameters<typeof FactoryFixture>[1]> = {}) {
		let form: Form | undefined;
		const screen = await render(FactoryFixture, {
			cartStore,
			components,
			product: makeProduct(RED),
			...props,
			expose: (f) => (form = f)
		});
		return { screen, form: form! };
	}

	it('throws without a cart provider', async () => {
		await expect(renderFactory({ cartStore: undefined })).rejects.toThrow(
			'ProductProvider must be used inside a <CartProvider>.'
		);
	});

	it('throws when the hooks run outside a ProductProvider', async () => {
		const { default: Consumer } = await import('../test-utils/cart/Consumer.svelte');
		for (const hook of ['useProduct', 'useProductForm'] as const) {
			expect(() => render(Consumer, { run: () => components[hook]() })).toThrow(
				`${hook} must be used inside a <ProductProvider>.`
			);
		}
	});

	it('creates the store from the product and the cart store', async () => {
		const product = makeProduct(RED);
		const { form } = await renderFactory({ product });
		expect(createProductFormStore).toHaveBeenCalledWith(product, cartStore);
		expect(form.selectedVariant).toBe(RED);
	});

	it("calls the provider's latest onSelect", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const { screen, form } = await renderFactory({ onSelect: first });
		await screen.rerender({ onSelect: second });
		form.selectOption('Color', 'Blue');
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledOnce();
	});

	it('hydrates the store when the product or its selected variant changes', async () => {
		const { screen, form } = await renderFactory();
		const store = vi.mocked(createProductFormStore).mock.results[0]?.value as ProductFormStore;
		const hydrate = vi.spyOn(store, 'hydrate');

		await screen.rerender({ product: makeProduct(RED) });
		expect(hydrate).not.toHaveBeenCalled();

		await screen.rerender({ product: makeProduct(BLUE) });
		expect(hydrate).toHaveBeenCalledOnce();
		expect(form.selectedVariant).toBe(BLUE);

		await screen.rerender({ product: makeProduct(BLUE, 'gid://shopify/Product/2') });
		expect(hydrate).toHaveBeenCalledTimes(2);
	});

	it('keeps a client-side selection when the product key is unchanged', async () => {
		const { screen, form } = await renderFactory();
		form.selectOption('Color', 'Blue');
		await screen.rerender({ product: makeProduct(RED) });
		expect(form.selectedVariant).toBe(BLUE);
	});

	it('unsubscribes from the cart on unmount', async () => {
		const { screen } = await renderFactory();
		expect(cartStore.listenerCount).toBe(1);
		screen.unmount();
		flushSync();
		await tick();
		expect(cartStore.listenerCount).toBe(0);
	});

	it('updates aria-pressed after a click', async () => {
		const { screen } = await renderFactory();
		const blue = screen.getByRole('button', { name: 'Blue' });
		await blue.click();
		await expect.element(blue).toHaveAttribute('aria-pressed', 'true');
		await expect.element(screen.getByTestId('selected')).toHaveTextContent('v-blue');
	});
});
