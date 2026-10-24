import { buildProductSelectionSearchParams, type SelectedOption } from '@shopify/hydrogen';

interface ProductLike {
	handle: string;
	options: readonly { name: string }[];
}

/** The product URL for a selection, keeping unrelated search params. */
export function variantHref(
	product: ProductLike,
	selectedOptions: readonly SelectedOption[],
	base: URLSearchParams,
	handle = product.handle
): string {
	const search = buildProductSelectionSearchParams({
		selectedOptions,
		optionNames: product.options.map((option) => option.name),
		base
	}).toString();
	return `/products/${handle}${search ? `?${search}` : ''}`;
}
