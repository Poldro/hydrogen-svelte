<script lang="ts">
	import type { CartStore, ProductInput } from '@shopify/hydrogen';

	import { setCartStore } from '../../cart/context.js';
	import type {
		OnProductSelect,
		ProductComponents,
		UseProductFormResult
	} from '../../product/product.svelte.js';
	import FactoryConsumer from './FactoryConsumer.svelte';

	let {
		cartStore,
		components,
		product,
		onSelect,
		expose
	}: {
		cartStore?: CartStore;
		components: ProductComponents<ProductInput>;
		product: ProductInput;
		onSelect?: OnProductSelect<ProductInput>;
		expose?: (form: UseProductFormResult<ProductInput>) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	if (cartStore) setCartStore(cartStore);

	// svelte-ignore state_referenced_locally
	const { ProductProvider } = components;
</script>

<ProductProvider {product} {onSelect}>
	<FactoryConsumer {components} {expose} />
</ProductProvider>
