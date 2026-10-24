<script lang="ts">
	import AddToCart from '$lib/components/AddToCart.svelte';
	import { formatMoney } from '$lib/money';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Products · hydrogen-svelte</title>
</svelte:head>

<h1>Products</h1>

{#if data.products.length === 0}
	<p>No products are published to this storefront yet.</p>
{:else}
	<ul class="grid">
		{#each data.products as product (product.id)}
			<li data-testid="product">
				{#if product.featuredImage}
					<img
						src="{product.featuredImage.url}&width=400"
						alt={product.featuredImage.altText ?? product.title}
						width="400"
						height="400"
						loading="lazy"
					/>
				{/if}
				<h2>{product.title}</h2>
				<p>{formatMoney(product.variant.price)}</p>
				<AddToCart
					merchandiseId={product.variant.id}
					disabled={!product.variant.availableForSale}
				/>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: 1.5rem;
		padding: 0;
		list-style: none;
	}
	img {
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		object-fit: cover;
		background: #f4f4f4;
	}
	h2 {
		font-size: 1rem;
		margin: 0.5rem 0 0.25rem;
	}
</style>
