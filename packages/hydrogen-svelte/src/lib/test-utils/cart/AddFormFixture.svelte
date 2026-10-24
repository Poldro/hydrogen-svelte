<script lang="ts">
	import type { CartFormPropsOptions } from '../../cart/cart.js';
	import CartProvider from '../../cart/CartProvider.svelte';
	import AddForm from './AddForm.svelte';

	let { options }: { options?: CartFormPropsOptions } = $props();
</script>

<CartProvider initialData={{ cart: null }}>
	<AddForm {options} />
</CartProvider>
