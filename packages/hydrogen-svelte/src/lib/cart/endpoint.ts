import { configureCartEndpoint as configureCoreCartEndpoint } from '@shopify/hydrogen';

export const DEFAULT_CART_ENDPOINT = '/api/cart';

// Module-level configuration, like the core and the official Vue bindings. It holds the same
// value for every request, so sharing it on the server is safe. Cart state never lives here.
let cartEndpoint = DEFAULT_CART_ENDPOINT;

/** Points cart forms and cart requests at a different endpoint than `/api/cart`. */
export function configureCartEndpoint(endpoint: string): void {
	cartEndpoint = endpoint;
	configureCoreCartEndpoint(endpoint);
}

/** Returns the endpoint that cart forms post to. */
export function getCartEndpoint(): string {
	return cartEndpoint;
}
