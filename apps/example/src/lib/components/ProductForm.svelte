<script lang="ts">
	import { page } from '$app/state';
	import { canAddToCart } from '@shopify/hydrogen';

	import { formatMoney } from '$lib/money';
	import { useProductForm } from '$lib/product';
	import type { ProductData } from '$lib/server/product-query';
	import { variantHref } from '$lib/variant-href';

	let { product }: { product: ProductData } = $props();

	const form = useProductForm();
	const addable = $derived(canAddToCart(product, form.options));

	/** Selects in place on a plain left click; any other click follows the link. */
	function selectOnClick(event: MouseEvent, optionName: string, value: string) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		event.preventDefault();
		form.selectOption(optionName, value);
	}
</script>

<p data-testid="price">
	{formatMoney(form.selectedVariant?.price ?? product.priceRange.minVariantPrice)}
</p>

{#each form.options as option (option.name)}
	<fieldset>
		<legend>{option.name}</legend>
		<!-- Links, so the selection works without JavaScript: the server reads ?Size=M. -->
		{#each option.values as value (value.name)}
			{#if value.exists}
				<a
					href={variantHref(product, value.selectedOptions, page.url.searchParams, value.handle)}
					aria-current={value.selected ? 'true' : undefined}
					class:unavailable={!value.available}
					onclick={(event) => selectOnClick(event, option.name, value.name)}
				>
					{value.name}
				</a>
			{/if}
		{/each}
	</fieldset>
{/each}

<form {...form.formProps()}>
	<input {...form.register('merchandiseId', {})} type="hidden" />
	<label>
		Quantity
		<input {...form.register('quantity', { defaultValue: 1 })} type="number" min="1" />
	</label>
	<button {...form.register('addToCart', {})} disabled={!addable || form.pending.current}>
		{#if form.pending.current}
			Adding…
		{:else if addable}
			Add to cart
		{:else if form.selectedVariant}
			Sold out
		{:else}
			Select options
		{/if}
	</button>
</form>

{#if form.errors.userErrors[0]}
	<p role="alert">{form.errors.userErrors[0].message}</p>
{/if}
{#if form.matchedLineItem}
	<p data-testid="in-cart">{form.matchedLineItem.quantity} in your cart</p>
{/if}

<style>
	fieldset {
		display: flex;
		gap: 0.5rem;
		border: none;
		padding: 0;
		margin: 1rem 0;
	}
	legend {
		font-weight: 600;
		margin-bottom: 0.5rem;
	}
	a {
		padding: 0.4rem 0.9rem;
		border: 1px solid #ccc;
		border-radius: 999px;
		color: inherit;
		text-decoration: none;
	}
	a[aria-current='true'] {
		background: #111;
		border-color: #111;
		color: #fff;
	}
	a.unavailable {
		text-decoration: line-through;
	}
	form {
		display: flex;
		gap: 1rem;
		align-items: end;
	}
	input[type='number'] {
		width: 4rem;
	}
</style>
