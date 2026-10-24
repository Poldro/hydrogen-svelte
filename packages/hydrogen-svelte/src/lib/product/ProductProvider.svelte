<script lang="ts" module>
	import type { ProductInput } from '@shopify/hydrogen';
	import type { Snippet } from 'svelte';

	import type { OnProductSelect } from './context.js';

	export interface ProductProviderProps<TProduct extends ProductInput = ProductInput> {
		/** The product from your Storefront API query. */
		product: TProduct;
		/** Runs after each resolved or unresolved option selection, e.g. to update the URL. */
		onSelect?: OnProductSelect<TProduct>;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { createProductFormStore } from '@shopify/hydrogen';
	import { onDestroy, untrack } from 'svelte';

	import { getCartStore } from '../cart/context.js';
	import { setProductContext } from './context.js';

	let { product, onSelect, children }: ProductProviderProps = $props();

	// One store per provider instance. It subscribes to the cart store as soon as it's created,
	// so it's destroyed in onDestroy, which also runs at the end of a server render.
	const cartStore = getCartStore('ProductProvider');
	// svelte-ignore state_referenced_locally
	const store = createProductFormStore(product, cartStore);
	setProductContext({ store, getOnSelect: () => onSelect });

	// Like the Vue provider, reload the product only when its ID or the selected variant's ID
	// changes, e.g. after a navigation, so a client-side selection survives unrelated prop updates.
	const productKey = $derived(`${product.id}:${product.selectedOrFirstAvailableVariant?.id ?? ''}`);
	// svelte-ignore state_referenced_locally
	let hydratedKey = productKey;
	$effect.pre(() => {
		if (productKey === hydratedKey) return;
		hydratedKey = productKey;
		untrack(() => store.hydrate(product));
	});

	onDestroy(() => store.destroy());
</script>

{@render children?.()}
