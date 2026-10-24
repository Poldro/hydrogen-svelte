<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { ValidProductSelectionResult } from 'hydrogen-svelte';

	import ProductForm from '$lib/components/ProductForm.svelte';
	import { ProductProvider } from '$lib/product';
	import type { ProductData } from '$lib/server/product-query';
	import { variantHref } from '$lib/variant-href';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Keeps the URL in sync with the selection. The load function re-runs, and the provider
	// reloads the product because the selected variant's ID changed.
	function onSelect(result: ValidProductSelectionResult<ProductData>) {
		const href = variantHref(data.product, result.selectedOptions, page.url.searchParams);
		void goto(href, { replaceState: true, noScroll: true, keepFocus: true });
	}
</script>

<svelte:head>
	<title>{data.product.title} · hydrogen-svelte</title>
</svelte:head>

<article>
	{#if data.product.featuredImage}
		<img
			src="{data.product.featuredImage.url}&width=600"
			alt={data.product.featuredImage.altText ?? data.product.title}
			width="600"
			height="600"
		/>
	{/if}
	<div>
		<h1>{data.product.title}</h1>
		<ProductProvider product={data.product} {onSelect}>
			<ProductForm product={data.product} />
		</ProductProvider>
		{#if data.product.description}
			<p>{data.product.description}</p>
		{/if}
	</div>
</article>

<style>
	article {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 2rem;
	}
	img {
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		object-fit: cover;
		background: #f4f4f4;
	}
</style>
