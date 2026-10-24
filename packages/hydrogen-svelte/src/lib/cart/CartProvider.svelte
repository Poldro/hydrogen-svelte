<script lang="ts" module>
	import type { CartData, CreateCartStoreOptions } from '@shopify/hydrogen';
	import type { Snippet } from 'svelte';

	export interface CartProviderProps<TData extends CartData = CartData> {
		/**
		 * The `data` of the cart GET handler's result, or a promise of it. Await it in your load
		 * function to server-render the real cart; a promise renders the loading state on the server.
		 */
		initialData?: CreateCartStoreOptions<TData>['initialData'];
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { configureCartEndpoint, createCartStore } from '@shopify/hydrogen';
	import { onMount } from 'svelte';

	import { setCartStore } from './context.js';
	import { getCartEndpoint } from './endpoint.js';

	let { initialData, children }: CartProviderProps = $props();

	// One store per provider instance: per request on the server, per mount in the browser.
	// Like the Vue provider, the store is created from the first initialData and ignores later changes.
	// svelte-ignore state_referenced_locally
	const store = setCartStore(createCartStore({ initialData }));

	onMount(() => {
		configureCartEndpoint(getCartEndpoint());
		store.connect();
		return () => store.destroy();
	});
</script>

{@render children?.()}
