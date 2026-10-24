import { createProductComponents } from 'hydrogen-svelte';

import type { ProductData } from '$lib/server/product-query';

// Type-only import, like the cart: the query stays on the server.
export const { ProductProvider, useProduct, useProductForm } =
	createProductComponents<ProductData>();
