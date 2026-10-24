<script lang="ts">
	import CartProvider, { type CartProviderProps } from '../../cart/CartProvider.svelte';
	import Consumer from './Consumer.svelte';

	let { initialData, run }: { initialData?: CartProviderProps['initialData']; run: () => void } =
		$props();
</script>

<CartProvider {initialData}>
	<Consumer {run} />
</CartProvider>
