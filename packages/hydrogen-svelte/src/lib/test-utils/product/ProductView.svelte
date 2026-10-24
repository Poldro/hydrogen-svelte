<script lang="ts">
	import type { ProductInput } from '@shopify/hydrogen';

	import type { CartFormPropsOptions } from '../../cart/cart.js';
	import type { UseProductFormResult } from '../../product/product.svelte.js';

	let {
		form,
		formOptions
	}: { form: UseProductFormResult<ProductInput>; formOptions?: CartFormPropsOptions } = $props();
</script>

<form {...form.formProps(formOptions)} data-testid="product-form">
	<input {...form.register('merchandiseId', {})} type="hidden" data-testid="merchandise-id" />
	{#each form.options as option (option.name)}
		{#each option.values as value (value.name)}
			<button
				type="button"
				{...form.register('optionValue', { optionName: option.name, value: value.name })}
				aria-pressed={value.selected}
			>
				{value.name}
			</button>
		{/each}
	{/each}
	<input {...form.register('quantity', { defaultValue: 2 })} type="number" data-testid="quantity" />
	<button {...form.register('addToCart', {})}>Add to cart</button>
	<output data-testid="pending">{form.pending.current}</output>
	<output data-testid="selected">{form.selectedVariant?.id ?? 'none'}</output>
</form>
