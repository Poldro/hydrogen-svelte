<script lang="ts">
	import type { ProductFormStore, ProductInput } from '@shopify/hydrogen';

	import type { CartFormPropsOptions } from '../../cart/cart.js';
	import {
		useProductForm,
		type OnProductSelect,
		type UseProductFormResult
	} from '../../product/product.svelte.js';
	import ProductView from './ProductView.svelte';

	let {
		store,
		onSelect,
		formOptions,
		expose
	}: {
		store: ProductFormStore;
		onSelect?: OnProductSelect<ProductInput>;
		formOptions?: CartFormPropsOptions;
		expose?: (form: UseProductFormResult<ProductInput>) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	const form = useProductForm(store, { onSelect });
	// svelte-ignore state_referenced_locally
	expose?.(form);
</script>

<ProductView {form} {formOptions} />
