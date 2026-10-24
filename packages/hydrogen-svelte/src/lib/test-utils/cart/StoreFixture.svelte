<script lang="ts">
	import type { CartStore } from '@shopify/hydrogen';

	import { setCartStore } from '../../cart/context.js';
	import CartView from './CartView.svelte';

	// Shares a given store directly, bypassing CartProvider, so tests can observe it.
	let { store }: { store: CartStore } = $props();

	// svelte-ignore state_referenced_locally
	setCartStore(store);
</script>

<CartView />
