import type { ProductInput, ProductVariantInput } from '@shopify/hydrogen';

function makeVariant(id: string, color: string, availableForSale = true): ProductVariantInput {
	return {
		id,
		title: color,
		availableForSale,
		price: { amount: '10.00', currencyCode: 'EUR' },
		selectedOptions: [{ name: 'Color', value: color }],
		product: { handle: 'shirt' }
	};
}

export const RED = makeVariant('v-red', 'Red');
export const BLUE = makeVariant('v-blue', 'Blue');
export const GREEN_SOLD_OUT = makeVariant('v-green', 'Green', false);

export function makeProduct(
	selectedOrFirstAvailableVariant: ProductVariantInput | null = RED,
	id = 'gid://shopify/Product/1'
): ProductInput {
	return {
		id,
		title: 'Shirt',
		handle: 'shirt',
		options: [
			{
				name: 'Color',
				optionValues: [
					{ name: 'Red', firstSelectableVariant: RED },
					{ name: 'Blue', firstSelectableVariant: BLUE },
					{ name: 'Green', firstSelectableVariant: GREEN_SOLD_OUT }
				]
			}
		],
		selectedOrFirstAvailableVariant,
		adjacentVariants: []
	};
}
