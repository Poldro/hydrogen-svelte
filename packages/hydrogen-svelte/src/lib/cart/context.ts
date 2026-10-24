import type { CartStore } from '@shopify/hydrogen';
import { getContext, hasContext, setContext } from 'svelte';

const CART_STORE_KEY = Symbol('hydrogen-svelte.cart-store');

/** Shares a cart store with the components below. Call during component initialisation. */
export function setCartStore(store: CartStore): CartStore {
	return setContext(CART_STORE_KEY, store);
}

/** Returns the nearest provider's cart store, or throws an error that names the calling hook. */
export function getCartStore(hookName = 'getCartStore'): CartStore {
	const store = getOptionalCartStore();
	if (!store) {
		throw new Error(`${hookName} must be used inside a <CartProvider>.`);
	}
	return store;
}

/** Returns the nearest provider's cart store, or `undefined` outside a provider. */
export function getOptionalCartStore(): CartStore | undefined {
	return hasContext(CART_STORE_KEY) ? getContext<CartStore>(CART_STORE_KEY) : undefined;
}
