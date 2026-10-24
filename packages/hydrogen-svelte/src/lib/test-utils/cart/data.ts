import {
	EMPTY_CART_DATA,
	EMPTY_CART_STATE,
	type CartData,
	type CartLine,
	type CartState
} from '@shopify/hydrogen';

const money = (amount: string) => ({ amount, currencyCode: 'EUR' });

export function makeLine(id: string, quantity: number, title: string): CartLine {
	return {
		id,
		quantity,
		cost: {
			totalAmount: money('10.00'),
			subtotalAmount: money('10.00'),
			amountPerQuantity: money('10.00'),
			compareAtAmountPerQuantity: null
		},
		merchandise: { id: `gid://shopify/ProductVariant/${id}`, product: { title } }
	};
}

export function makeCartData(lines: CartLine[] = []): CartData {
	return {
		...EMPTY_CART_DATA,
		id: 'gid://shopify/Cart/123',
		checkoutUrl: 'https://example.com/checkout',
		totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
		lines: { nodes: lines }
	};
}

export function makeCartState(overrides: Partial<CartState> = {}): CartState {
	return {
		...EMPTY_CART_STATE,
		data: makeCartData(),
		loading: false,
		...overrides
	};
}
