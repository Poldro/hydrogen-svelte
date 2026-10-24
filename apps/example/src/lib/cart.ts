import { createCartComponents } from 'hydrogen-svelte';

import type { cartHandlers } from '$lib/server/cart-handlers';

// Type-only import: the handlers stay on the server, only their cart type reaches the browser.
export const { CartProvider, useCart, useOptionalCart, useCartActions, useCartForm } =
	createCartComponents<typeof cartHandlers>();
