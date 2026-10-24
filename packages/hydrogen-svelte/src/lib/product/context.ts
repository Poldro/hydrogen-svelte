import type { ProductFormStore, ProductInput, ValidProductSelectionResult } from '@shopify/hydrogen';
import { getContext, hasContext, setContext } from 'svelte';

const PRODUCT_CONTEXT_KEY = Symbol('hydrogen-svelte.product-form-store');

export type OnProductSelect<TProduct extends ProductInput> = (
	result: ValidProductSelectionResult<TProduct>
) => void;

export interface ProductContextValue<TProduct extends ProductInput = ProductInput> {
	store: ProductFormStore<TProduct>;
	/** Reads the provider's latest `onSelect` prop. */
	getOnSelect: () => OnProductSelect<TProduct> | undefined;
}

/** Shares a product form store with the components below. Call during component initialisation. */
export function setProductContext<TProduct extends ProductInput>(
	value: ProductContextValue<TProduct>
): ProductContextValue<TProduct> {
	return setContext(PRODUCT_CONTEXT_KEY, value);
}

/** Returns the nearest `<ProductProvider>`'s context, or throws an error that names the calling hook. */
export function getProductContext<TProduct extends ProductInput>(
	hookName: string
): ProductContextValue<TProduct> {
	if (!hasContext(PRODUCT_CONTEXT_KEY)) {
		throw new Error(
			`${hookName} must be used inside a <ProductProvider>. ` +
				'Wrap your component tree with the ProductProvider from createProductComponents(), ' +
				'or use the standalone useProductForm(store) function instead.'
		);
	}
	return getContext<ProductContextValue<TProduct>>(PRODUCT_CONTEXT_KEY);
}
