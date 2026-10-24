<script lang="ts">
	import CartProvider, { type CartProviderProps } from '../../cart/CartProvider.svelte';
	import CartView from './CartView.svelte';

	let {
		initialData,
		onRender
	}: { initialData?: CartProviderProps['initialData']; onRender?: (count: number) => void } =
		$props();
</script>

<CartProvider {initialData}>
	<CartView {onRender} />
</CartProvider>
