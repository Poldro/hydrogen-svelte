<script lang="ts">
	import { getPredictiveSearchItemUrl } from '@shopify/hydrogen';

	import { formatMoney } from '$lib/money';
	import { routeTemplates } from '$lib/route-templates';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Search · hydrogen-svelte</title>
</svelte:head>

<h1>Search</h1>

<form method="get" action="/search" role="search">
	<input name="q" type="search" value={data.term} aria-label="Search products" />
	<button type="submit">Search</button>
</form>

{#if data.term}
	{#if data.products.length}
		<ul>
			{#each data.products as product (product.id)}
				<li data-testid="search-page-result">
					<a href={getPredictiveSearchItemUrl(product, { routes: routeTemplates, term: data.term })}
						>{product.title}</a
					>
					{#if product.selectedOrFirstAvailableVariant}
						— {formatMoney(product.selectedOrFirstAvailableVariant.price)}
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p data-testid="search-page-empty">No results for “{data.term}”.</p>
	{/if}
{/if}
