import {
	createCartFormRegister,
	trackCartAnalytics,
	type CartActions,
	type CartData,
	type CartDataFromHandlers,
	type CartFormRegister,
	type CartState
} from '@shopify/hydrogen';
import { onMount, type Component } from 'svelte';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';

import {
	fromHydrogenStore,
	type EqualityFn,
	type HydrogenStore,
	type ReactiveValue,
	type Selector
} from '../internal/from-store.js';
import { getCartStore, getOptionalCartStore } from './context.js';
import CartProvider, { type CartProviderProps } from './CartProvider.svelte';
import { getCartEndpoint } from './endpoint.js';

export type { CartActions };
export { configureCartEndpoint, getCartEndpoint } from './endpoint.js';

const UNDEFINED_VALUE: ReactiveValue<undefined> = Object.freeze({ current: undefined });

function asTypedStore<TData extends CartData>(
	store: HydrogenStore<CartState>
): HydrogenStore<CartState<TData>> {
	return store as unknown as HydrogenStore<CartState<TData>>;
}

/**
 * Returns cart state as a reactive value. Read `current` in a template or an effect.
 *
 * Without a selector, `current` holds the full cart state. With a selector, `current` holds the
 * selected value, and readers update only when it changes by reference or when `isEqual` reports
 * a change. Throws outside a `<CartProvider>`.
 *
 * @example
 * ```svelte
 * <script>
 *   const lines = useCart((s) => s.data.lines.nodes);
 * </script>
 *
 * {#each lines.current as line (line.id)}…{/each}
 * ```
 */
export function useCart(): ReactiveValue<CartState>;
export function useCart<TData extends CartData = CartData, S = unknown>(
	selector: Selector<CartState<TData>, S>,
	isEqual?: EqualityFn<S>
): ReactiveValue<S>;
export function useCart<TData extends CartData = CartData, S = unknown>(
	selector?: Selector<CartState<TData>, S>,
	isEqual?: EqualityFn<S>
): ReactiveValue<S | CartState<TData>> {
	const store = asTypedStore<TData>(getCartStore('useCart'));
	if (!selector) return fromHydrogenStore(store);
	return fromHydrogenStore(store, selector, isEqual);
}

/**
 * Returns the selected cart state as a reactive value whose `current` is `undefined` outside a
 * `<CartProvider>`. Use it in components that also render above the provider, such as a header
 * badge on an error page.
 */
export function useOptionalCart<TData extends CartData = CartData, S = unknown>(
	selector: Selector<CartState<TData>, S>,
	isEqual?: EqualityFn<S>
): ReactiveValue<S | undefined> {
	const store = getOptionalCartStore();
	if (!store) return UNDEFINED_VALUE;
	return fromHydrogenStore(asTypedStore<TData>(store), selector, isEqual);
}

/** Returns the `refresh` action. Call it after a server-side cart mutation that bypasses cart forms. */
export function useCartActions(): CartActions {
	const store = getCartStore('useCartActions');
	return { refresh: store.refresh };
}

/** Publishes cart analytics events while the calling component is mounted. Call it once near the root. */
export function useCartAnalytics(): void {
	const store = getCartStore('useCartAnalytics');
	onMount(() => trackCartAnalytics(store));
}

export interface CartFormPropsOptions {
	/** Runs before the cart submission. Call `event.preventDefault()` to skip it. */
	beforeSubmit?: (event: SubmitEvent) => void;
	/** Runs after the cart submission starts. */
	afterSubmit?: (event: SubmitEvent) => void;
}

/** Attributes to spread on a cart `<form>`. The symbol key holds the submit attachment. */
export type CartFormProps = {
	method: 'post';
	action: string;
	[attachment: symbol]: Attachment<HTMLFormElement>;
};

export interface CartFormPending {
	/** `true` during a full cart load. */
	readonly initial: boolean;
	/** Whether the given line, or any line when called without an ID, has a change in flight. */
	lines(lineId?: string): boolean;
}

export interface UseCartFormResult {
	formProps(options?: CartFormPropsOptions): CartFormProps;
	register: CartFormRegister;
	isPending: CartFormPending;
}

/**
 * Returns form props, a register function, and pending state for cart forms.
 *
 * `formProps()` renders `method="post"` and the cart endpoint as `action`, so the form works
 * without JavaScript. Once hydrated, its attachment sends each submission through the cart store.
 *
 * @example
 * ```svelte
 * <script>
 *   const { formProps, register, isPending } = useCartForm();
 * </script>
 *
 * <form {...formProps()}>
 *   <input {...register('lineId', { value: line.id })} type="hidden" />
 *   <button {...register('increase')}>+</button>
 *   {#if isPending.lines(line.id)}Updating…{/if}
 * </form>
 * ```
 */
export function useCartForm(): UseCartFormResult {
	const store = getCartStore('useCartForm');
	const loading = fromHydrogenStore(store, (s) => s.loading);
	const pendingLines = fromHydrogenStore(store, (s) => s.pending.lines);
	const register = createCartFormRegister();
	const submitKey = createAttachmentKey();

	const submitWith =
		(options?: CartFormPropsOptions): Attachment<HTMLFormElement> =>
		(form) => {
			const onSubmit = (event: SubmitEvent) => {
				options?.beforeSubmit?.(event);
				if (event.defaultPrevented) return;
				event.preventDefault();
				// The store records failed submissions in `state.errors`, so the rejection needs no handling here.
				store.handleFormSubmit(event).catch(() => {});
				options?.afterSubmit?.(event);
			};
			form.addEventListener('submit', onSubmit);
			return () => form.removeEventListener('submit', onSubmit);
		};

	return {
		formProps: (options) => ({
			method: 'post',
			action: getCartEndpoint(),
			[submitKey]: submitWith(options)
		}),
		register,
		isPending: {
			get initial() {
				return loading.current;
			},
			lines: (lineId) =>
				lineId ? pendingLines.current.has(lineId) : pendingLines.current.size > 0
		}
	};
}

type TypedUseCart<TData extends CartData> = {
	(): ReactiveValue<CartState<TData>>;
	<S>(selector: Selector<CartState<TData>, S>, isEqual?: EqualityFn<S>): ReactiveValue<S>;
};

type TypedUseOptionalCart<TData extends CartData> = <S>(
	selector: Selector<CartState<TData>, S>,
	isEqual?: EqualityFn<S>
) => ReactiveValue<S | undefined>;

/** The cart provider and hooks, typed with the custom fields of your cart server handlers. */
export interface CartComponents<TData extends CartData> {
	/** Creates the cart store, connects it on mount and destroys it on unmount. */
	CartProvider: Component<CartProviderProps<TData>>;
	useCart: TypedUseCart<TData>;
	useOptionalCart: TypedUseOptionalCart<TData>;
	useCartActions: typeof useCartActions;
	useCartForm: typeof useCartForm;
}

/**
 * Returns a cart provider and hooks typed to the cart query in your cart server handlers.
 *
 * @example
 * ```ts
 * import type { cartHandlers } from '$lib/server/cart-handlers';
 *
 * export const { CartProvider, useCart, useOptionalCart, useCartActions, useCartForm } =
 *   createCartComponents<typeof cartHandlers>();
 * ```
 */
export function createCartComponents<THandlers>(): CartComponents<CartDataFromHandlers<THandlers>> {
	type TData = CartDataFromHandlers<THandlers>;
	return {
		CartProvider: CartProvider as unknown as Component<CartProviderProps<TData>>,
		useCart: useCart as TypedUseCart<TData>,
		useOptionalCart: useOptionalCart as TypedUseOptionalCart<TData>,
		useCartActions,
		useCartForm
	};
}
