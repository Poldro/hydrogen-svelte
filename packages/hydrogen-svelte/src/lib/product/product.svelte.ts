import {
	createProductFormRegister,
	type CartLine,
	type ProductAddToCartProps,
	type ProductFormErrors,
	type ProductFormOptions,
	type ProductFormStore,
	type ProductInput,
	type ProductMerchandiseIdProps,
	type ProductQuantityDefaultProps,
	type ProductQuantityProps,
	type ProductVariantFrom,
	type VariantSelectionResult
} from '@shopify/hydrogen';
import type { Component } from 'svelte';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';

import type { CartFormProps, CartFormPropsOptions } from '../cart/cart.js';
import { getCartEndpoint } from '../cart/endpoint.js';
import { fromHydrogenStore, type ReactiveValue } from '../internal/from-store.js';
import { getProductContext, type OnProductSelect } from './context.js';
import ProductProvider, { type ProductProviderProps } from './ProductProvider.svelte';

export type { ValidProductSelectionResult } from '@shopify/hydrogen';
export type { OnProductSelect };

/**
 * Props for a control that selects one option value, such as a swatch or a radio button.
 *
 * Unlike the core `ProductOptionValueProps`, the handlers are lowercase: Svelte matches spread
 * event props by their exact name, so `onClick` would listen for a `Click` event.
 */
export interface ProductOptionValueProps {
	name: string;
	value: string;
	onchange: () => void;
	onclick: () => void;
}

type AttributeValueName = `attributes.${string}`;

/** Returns the props for one product form field. Spread them on the matching input or button. */
export type ProductFormRegister = {
	(field: 'merchandiseId', opts: Record<string, never>): ProductMerchandiseIdProps;
	(field: 'quantity', opts: { value: number }): ProductQuantityProps;
	(field: 'quantity', opts: { defaultValue: number }): ProductQuantityDefaultProps;
	(field: 'optionValue', opts: { optionName: string; value: string }): ProductOptionValueProps;
	(
		field: 'attributeValue',
		opts: { key: string; value: string }
	): { name: AttributeValueName; value: string };
	(
		field: 'attributeValue',
		opts: { key: string; defaultValue: string }
	): { name: AttributeValueName; defaultValue: string };
	(field: 'addToCart', opts: Record<string, never>): ProductAddToCartProps;
};

/** Options for the standalone product form function. */
export interface UseProductFormOptions<TProduct extends ProductInput> {
	/** Runs after each resolved or unresolved option selection. Captured when the function runs. */
	onSelect?: OnProductSelect<TProduct>;
}

type SelectOption<TProduct extends ProductInput> = (
	name: string,
	value: string
) => VariantSelectionResult<ProductVariantFrom<TProduct>>;

/** Product state and variant selection. Read properties from the object: destructuring loses reactivity. */
export interface UseProductResult<TProduct extends ProductInput> {
	readonly options: ProductFormOptions<TProduct>;
	readonly selectedVariant: ProductVariantFrom<TProduct> | null;
	readonly errors: ProductFormErrors;
	readonly matchedLineItem: CartLine | null;
	selectOption: SelectOption<TProduct>;
}

/** Product state plus field registration, form props, and pending state. */
export interface UseProductFormResult<TProduct extends ProductInput>
	extends UseProductResult<TProduct> {
	readonly register: ProductFormRegister;
	formProps(options?: CartFormPropsOptions): CartFormProps;
	/** `current` is `true` while a submission is in flight. */
	pending: ReactiveValue<boolean>;
}

/** Reads product form state reactively and wraps `selectOption` to call `onSelect`. */
function useProductImpl<TProduct extends ProductInput>(
	store: ProductFormStore<TProduct>,
	getOnSelect: () => OnProductSelect<TProduct> | undefined
): UseProductResult<TProduct> {
	const state = fromHydrogenStore(store);

	const selectOption: SelectOption<TProduct> = (name, value) => {
		const result = store.selectOption(name, value);
		if (result.status !== 'invalid') getOnSelect()?.(result);
		return result;
	};

	return {
		get options() {
			return state.current.options;
		},
		get selectedVariant() {
			return state.current.selectedVariant;
		},
		get errors() {
			return state.current.errors;
		},
		get matchedLineItem() {
			return state.current.matchedLineItem;
		},
		selectOption
	};
}

/** Wraps the core register and renames the option value handlers to Svelte's lowercase event props. */
function createRegister(
	selectedVariant: Parameters<typeof createProductFormRegister>[0],
	selectOption: (name: string, value: string) => void
): ProductFormRegister {
	const register = createProductFormRegister(selectedVariant, selectOption) as unknown as (
		field: string,
		opts: unknown
	) => Record<string, unknown>;

	return ((field: string, opts: unknown) => {
		const props = register(field, opts);
		if (field !== 'optionValue') return props;
		const { onChange, onClick, ...rest } = props;
		return { ...rest, onchange: onChange, onclick: onClick };
	}) as ProductFormRegister;
}

function useProductFormImpl<TProduct extends ProductInput>(
	store: ProductFormStore<TProduct>,
	getOnSelect: () => OnProductSelect<TProduct> | undefined
): UseProductFormResult<TProduct> {
	const product = useProductImpl(store, getOnSelect);
	const submitKey = createAttachmentKey();
	let pending = $state(false);

	const submitWith =
		(options?: CartFormPropsOptions): Attachment<HTMLFormElement> =>
		(form) => {
			const onSubmit = (event: SubmitEvent) => {
				options?.beforeSubmit?.(event);
				if (event.defaultPrevented) return;
				event.preventDefault();
				pending = true;
				// Like the cart forms, failures land in `errors` through the cart store, so a rejection
				// only skips `afterSubmit`. (The Vue bindings also log it with Hydrogen's internal logger.)
				store
					.handleFormSubmit(event)
					.then(() => options?.afterSubmit?.(event))
					.catch(() => {})
					.finally(() => {
						pending = false;
					});
			};
			form.addEventListener('submit', onSubmit);
			return () => form.removeEventListener('submit', onSubmit);
		};

	return {
		get options() {
			return product.options;
		},
		get selectedVariant() {
			return product.selectedVariant;
		},
		get errors() {
			return product.errors;
		},
		get matchedLineItem() {
			return product.matchedLineItem;
		},
		selectOption: product.selectOption,
		get register() {
			return createRegister(product.selectedVariant, product.selectOption);
		},
		formProps: (options) => ({
			method: 'post',
			action: getCartEndpoint(),
			[submitKey]: submitWith(options)
		}),
		pending: {
			get current() {
				return pending;
			}
		}
	};
}

/**
 * Returns reactive form state for a product form store you manage yourself.
 *
 * Create the store with `createProductFormStore`, then hydrate and destroy it yourself. For a
 * provider that manages the store, use `createProductComponents`.
 *
 * `formProps()` renders `method="post"` and the cart endpoint as `action`, so the form adds to
 * the cart without JavaScript. Once hydrated, its attachment sends the submission through the store.
 *
 * @example
 * ```svelte
 * <script>
 *   const form = useProductForm(store);
 * </script>
 *
 * <form {...form.formProps()}>
 *   <input {...form.register('merchandiseId', {})} type="hidden" />
 *   <button {...form.register('addToCart', {})} disabled={form.pending.current}>Add to cart</button>
 * </form>
 * ```
 */
export function useProductForm<TProduct extends ProductInput>(
	store: ProductFormStore<TProduct>,
	options?: UseProductFormOptions<TProduct>
): UseProductFormResult<TProduct> {
	const onSelect = options?.onSelect;
	return useProductFormImpl(store, () => onSelect);
}

/** The product provider and hooks, typed to your product query. */
export interface ProductComponents<TProduct extends ProductInput> {
	/** Creates the product form store, reloads it when the product changes, and destroys it on unmount. */
	ProductProvider: Component<ProductProviderProps<TProduct>>;
	useProduct: () => UseProductResult<TProduct>;
	useProductForm: () => UseProductFormResult<TProduct>;
}

/**
 * Returns a product provider and hooks typed to your product query.
 *
 * The provider needs a `<CartProvider>` ancestor. Both hooks read the provider's latest
 * `onSelect` prop, and throw outside a `<ProductProvider>`.
 *
 * @example
 * ```ts
 * export const { ProductProvider, useProduct, useProductForm } =
 *   createProductComponents<ProductQuery['product']>();
 * ```
 */
export function createProductComponents<
	TProduct extends ProductInput
>(): ProductComponents<TProduct> {
	return {
		ProductProvider: ProductProvider as unknown as Component<ProductProviderProps<TProduct>>,
		useProduct: () => {
			const ctx = getProductContext<TProduct>('useProduct');
			return useProductImpl(ctx.store, ctx.getOnSelect);
		},
		useProductForm: () => {
			const ctx = getProductContext<TProduct>('useProductForm');
			return useProductFormImpl(ctx.store, ctx.getOnSelect);
		}
	};
}
