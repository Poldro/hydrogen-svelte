<script lang="ts">
	import type { ProductInput } from '@shopify/hydrogen';

	import type { ProductComponents, UseProductFormResult } from '../../product/product.svelte.js';
	import ProductView from './ProductView.svelte';

	let {
		components,
		expose
	}: {
		components: ProductComponents<ProductInput>;
		expose?: (form: UseProductFormResult<ProductInput>) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	const form = components.useProductForm();
	// svelte-ignore state_referenced_locally
	expose?.(form);
</script>

<ProductView {form} />
