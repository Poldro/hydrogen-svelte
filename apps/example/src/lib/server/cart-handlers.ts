import { createCartServerHandlers } from '@shopify/hydrogen';

/**
 * Cart route handlers. `hooks.server.ts` registers them with `handleShopifyRoutes` to serve
 * `/api/cart`, and `+layout.server.ts` calls `get` to server-render the cart.
 * `$lib/cart` derives the typed cart hooks from this value's type.
 */
export const cartHandlers = createCartServerHandlers();
