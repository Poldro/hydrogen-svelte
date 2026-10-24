import {
	configureCartEndpoint as configureCoreCartEndpoint,
	createCartStore,
	trackCartAnalytics,
	type CartState
} from '@shopify/hydrogen';
import { flushSync, tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import AddFormFixture from '../test-utils/cart/AddFormFixture.svelte';
import CartFixture from '../test-utils/cart/CartFixture.svelte';
import Consumer from '../test-utils/cart/Consumer.svelte';
import { makeCartData, makeCartState, makeLine } from '../test-utils/cart/data.js';
import { createMockCartStore, type MockCartStore } from '../test-utils/cart/mock-store.js';
import WithProvider from '../test-utils/cart/WithProvider.svelte';
import {
	configureCartEndpoint,
	createCartComponents,
	useCart,
	useCartActions,
	useCartAnalytics,
	useCartForm,
	useOptionalCart
} from './cart.js';

const stopTracking = vi.hoisted(() => vi.fn());

vi.mock('@shopify/hydrogen', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@shopify/hydrogen')>();
	return {
		...actual,
		configureCartEndpoint: vi.fn(),
		createCartStore: vi.fn(),
		trackCartAnalytics: vi.fn(() => stopTracking)
	};
});

let store: MockCartStore;

function useStoreWith(state: CartState) {
	vi.mocked(createCartStore).mockImplementation(() => {
		store = createMockCartStore(state);
		return store;
	});
}

/** Renders a consumer inside a provider and returns whatever `setup` returns. */
async function withProvider<T>(setup: () => T): Promise<T> {
	let captured: { value: T } | undefined;
	await render(WithProvider, { run: () => (captured = { value: setup() }) });
	if (!captured) throw new Error('consumer did not run');
	return captured.value;
}

const twoLines = () =>
	makeCartData([makeLine('line-1', 1, 'Tea'), makeLine('line-2', 2, 'Honey')]);

beforeEach(() => {
	vi.clearAllMocks();
	configureCartEndpoint('/api/cart');
	useStoreWith(makeCartState({ data: twoLines() }));
});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('CartProvider', () => {
	it('creates the store from initialData', async () => {
		const initialData = { cart: twoLines() };
		await render(CartFixture, { initialData });
		expect(createCartStore).toHaveBeenCalledWith({ initialData });
	});

	it('configures the endpoint and connects on mount, destroys on unmount', async () => {
		const screen = await render(CartFixture, {});
		expect(configureCoreCartEndpoint).toHaveBeenCalledWith('/api/cart');
		expect(store.connect).toHaveBeenCalledOnce();
		expect(store.destroy).not.toHaveBeenCalled();

		await screen.unmount();
		expect(store.destroy).toHaveBeenCalledOnce();
	});

	it('does not recreate the store when initialData changes', async () => {
		const screen = await render(CartFixture, { initialData: { cart: null } });
		await screen.rerender({ initialData: { cart: twoLines() } });
		expect(createCartStore).toHaveBeenCalledOnce();
	});

	it('creates one store per provider instance', async () => {
		await render(CartFixture, {});
		await render(CartFixture, {});
		expect(createCartStore).toHaveBeenCalledTimes(2);
	});

	it('renders the cart from the store', async () => {
		const screen = await render(CartFixture, {});
		await expect.element(screen.getByTestId('count')).toHaveTextContent('3');
		await expect.element(screen.getByText('Honey')).toBeVisible();
	});
});

describe('useCart', () => {
	it('throws a hook-specific error outside CartProvider', async () => {
		let error: unknown;
		await render(Consumer, {
			run: () => {
				try {
					useCart();
				} catch (e) {
					error = e;
				}
			}
		});
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toBe('useCart must be used inside a <CartProvider>.');
	});

	it('returns the full state without a selector', async () => {
		const cart = await withProvider(() => useCart());
		expect(cart.current).toBe(store.getState());
	});

	it('returns the selected slice', async () => {
		const ids = await withProvider(() => useCart((s) => s.data.lines.nodes.map((l) => l.id)));
		expect(ids.current).toEqual(['line-1', 'line-2']);
	});

	it('re-renders only when the selected slice changes', async () => {
		const renders: number[] = [];
		await render(CartFixture, { onRender: (count) => renders.push(count) });

		store.setState({ ...store.getState(), revalidating: true });
		flushSync();
		store.setState({ ...store.getState(), data: { ...store.getState().data, totalQuantity: 4 } });
		flushSync();

		expect(renders).toEqual([3, 4]);
	});

	it('honours a custom isEqual', async () => {
		const sameLength = (a: unknown[], b: unknown[]) => a.length === b.length;
		const lines = await withProvider(() => useCart((s) => s.data.lines.nodes, sameLength));
		const first = lines.current;

		store.setState({
			...store.getState(),
			data: { ...store.getState().data, lines: { nodes: [...first] } }
		});
		expect(lines.current).toBe(first);
	});

	it('releases the store subscription after unmount', async () => {
		const screen = await render(CartFixture, {});
		expect(store.listenerCount).toBeGreaterThan(0);
		await screen.unmount();
		await tick();
		await Promise.resolve();
		expect(store.listenerCount).toBe(0);
	});
});

describe('useOptionalCart', () => {
	it('returns undefined outside CartProvider', async () => {
		let count: { current: number | undefined } | undefined;
		await render(Consumer, { run: () => (count = useOptionalCart((s) => s.data.totalQuantity)) });
		expect(count?.current).toBeUndefined();
	});

	it('returns the selected slice inside CartProvider', async () => {
		const count = await withProvider(() => useOptionalCart((s) => s.data.totalQuantity));
		expect(count.current).toBe(3);
	});
});

describe('useCartActions', () => {
	it('returns the store refresh action', async () => {
		const { refresh } = await withProvider(() => useCartActions());
		refresh();
		expect(store.refresh).toHaveBeenCalledOnce();
	});
});

describe('useCartAnalytics', () => {
	it('starts tracking on mount and stops on unmount', async () => {
		const screen = await render(WithProvider, { run: () => useCartAnalytics() });
		expect(trackCartAnalytics).toHaveBeenCalledWith(store);
		expect(stopTracking).not.toHaveBeenCalled();

		await screen.unmount();
		expect(stopTracking).toHaveBeenCalledOnce();
	});
});

describe('useCartForm', () => {
	it('formProps returns method, action and an attachment', async () => {
		const props = await withProvider(() => useCartForm().formProps());
		expect(props.method).toBe('post');
		expect(props.action).toBe('/api/cart');
		const attachments = Object.getOwnPropertySymbols(props);
		expect(attachments).toHaveLength(1);
		expect(typeof props[attachments[0] as keyof typeof props]).toBe('function');
	});

	it('renders method and action on the form element', async () => {
		const screen = await render(AddFormFixture, {});
		const form = screen.getByTestId('add-form').element() as HTMLFormElement;
		expect(form.getAttribute('method')).toBe('post');
		expect(form.getAttribute('action')).toBe('/api/cart');
	});

	it('passes the same SubmitEvent to beforeSubmit, the store and afterSubmit, in order', async () => {
		const calls: Array<{ step: string; event: SubmitEvent }> = [];
		const screen = await render(AddFormFixture, {
			options: {
				beforeSubmit: (event) => calls.push({ step: 'before', event }),
				afterSubmit: (event) => calls.push({ step: 'after', event })
			}
		});
		vi.mocked(store.handleFormSubmit).mockImplementation((event) => {
			calls.push({ step: 'store', event });
			return Promise.resolve();
		});

		await screen.getByRole('button', { name: 'Add to cart' }).click();

		expect(calls.map((c) => c.step)).toEqual(['before', 'store', 'after']);
		const [first] = calls;
		expect(first?.event).toBeInstanceOf(SubmitEvent);
		expect(first?.event.defaultPrevented).toBe(true);
		expect(first?.event.submitter?.getAttribute('value')).toBe('add');
		for (const call of calls) expect(call.event).toBe(first?.event);
	});

	it('skips the store when beforeSubmit prevents the default', async () => {
		const screen = await render(AddFormFixture, {
			options: { beforeSubmit: (event) => event.preventDefault() }
		});
		await screen.getByRole('button', { name: 'Add to cart' }).click();
		expect(store.handleFormSubmit).not.toHaveBeenCalled();
	});

	it('swallows a rejected handleFormSubmit', async () => {
		const screen = await render(AddFormFixture, {});
		vi.mocked(store.handleFormSubmit).mockRejectedValue(new Error('boom'));
		await screen.getByRole('button', { name: 'Add to cart' }).click();
		expect(store.handleFormSubmit).toHaveBeenCalledOnce();
	});

	it('register returns the core attributes', async () => {
		const { register } = await withProvider(() => useCartForm());
		expect(register('lineId', { value: 'line-1' })).toEqual({
			name: 'lineId',
			value: 'line-1',
			readOnly: true
		});
		expect(register('increase')).toEqual({ name: 'intent', value: 'increase' });
	});

	it('isPending.initial follows the loading state', async () => {
		useStoreWith(makeCartState({ loading: true }));
		const screen = await render(CartFixture, {});
		await expect.element(screen.getByText('Loading cart')).toBeVisible();

		store.setState({ ...store.getState(), loading: false });
		await expect.element(screen.getByText('Loading cart')).not.toBeInTheDocument();
	});

	it('isPending.lines() reports any line or one line', async () => {
		const screen = await render(CartFixture, {});
		const pending = { ...store.getState().pending, lines: new Set(['line-2']) };
		store.setState({ ...store.getState(), pending });

		await expect.element(screen.getByText('Cart updating')).toBeVisible();
		await expect.element(screen.getByText('Updating line-2')).toBeVisible();
		await expect.element(screen.getByText('Updating line-1')).not.toBeInTheDocument();
	});

	it('uses a custom endpoint for the form action and the core transport', async () => {
		configureCartEndpoint('/custom/cart');
		const screen = await render(AddFormFixture, {});
		const form = screen.getByTestId('add-form').element() as HTMLFormElement;
		expect(form.getAttribute('action')).toBe('/custom/cart');
		expect(configureCoreCartEndpoint).toHaveBeenCalledWith('/custom/cart');
	});
});

describe('quantityInput', () => {
	it('submits the form with the set button when the quantity changes', async () => {
		const screen = await render(CartFixture, {});
		const input = screen.getByRole('textbox', { name: 'Quantity' }).first();

		await input.fill('5');
		(input.element() as HTMLInputElement).dispatchEvent(new Event('change', { bubbles: true }));

		expect(store.handleFormSubmit).toHaveBeenCalledOnce();
		const [event] = vi.mocked(store.handleFormSubmit).mock.calls[0] ?? [];
		expect(event?.submitter?.getAttribute('value')).toBe('set');
	});
});

describe('createCartComponents', () => {
	it('returns the provider and the hooks', () => {
		const components = createCartComponents();
		expect(Object.keys(components).sort()).toEqual([
			'CartProvider',
			'useCart',
			'useCartActions',
			'useCartForm',
			'useOptionalCart'
		]);
		expect(components.useCartActions).toBe(useCartActions);
		expect(components.useCartForm).toBe(useCartForm);
	});
});
