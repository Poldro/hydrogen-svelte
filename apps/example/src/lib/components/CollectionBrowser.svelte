<script lang="ts">
	import { page } from '$app/state';
	import {
		getFilterRemovalUrl,
		getSortByValue,
		isFilterInputActive,
		serializeCollectionParams,
		type AvailableFilter,
		type ProductFilter
	} from '@shopify/hydrogen';
	import { useCollection, useCollectionForm } from 'hydrogen-svelte';

	import { formatMoney } from '$lib/money';
	import { pageHref } from '$lib/pagination';
	import type { CollectionPageData } from '$lib/server/collection-query';

	let { collection }: { collection: CollectionPageData } = $props();

	const SORT_OPTIONS = [
		{ label: 'Featured', value: getSortByValue('COLLECTION_DEFAULT', false) },
		{ label: 'Price, low to high', value: getSortByValue('PRICE', false) },
		{ label: 'Price, high to low', value: getSortByValue('PRICE', true) },
		{ label: 'Alphabetically, A-Z', value: getSortByValue('TITLE', false) },
		{ label: 'Alphabetically, Z-A', value: getSortByValue('TITLE', true) }
	];

	const state = useCollection();
	const { formProps } = useCollectionForm();

	const products = $derived(collection.products.nodes);
	const pageInfo = $derived(collection.products.pageInfo);
	const loading = $derived(state.current.status === 'loading');
	const sortValue = $derived(
		getSortByValue(state.current.sortKey ?? 'COLLECTION_DEFAULT', state.current.reverse)
	);
	const price = $derived(state.current.filters.find((f) => f.price)?.price);
	const activeParams = $derived(serializeCollectionParams(state.current));

	/** The URL param for one filter value, or `null` when the input can't be parsed. */
	function paramFor(input: string): { name: string; value: string } | null {
		try {
			const filter = JSON.parse(input) as ProductFilter;
			const [entry] = serializeCollectionParams({ filters: [filter], sortKey: undefined, reverse: false });
			return entry ? { name: entry[0], value: entry[1] } : null;
		} catch {
			return null;
		}
	}

	function describe(filter: ProductFilter): string {
		if (filter.available != null) return filter.available ? 'In stock' : 'Out of stock';
		if (filter.price) return `Price ${filter.price.min ?? 0}–${filter.price.max ?? '…'}`;
		return filter.tag ?? filter.productType ?? filter.productVendor ?? filter.variantOption?.value ?? 'Filter';
	}

	function removalHref(filter: ProductFilter): string {
		const search = getFilterRemovalUrl(activeParams, filter);
		return search === '?' ? page.url.pathname : `${page.url.pathname}${search}`;
	}

	const listFilters = (filters: AvailableFilter[]) => filters.filter((f) => f.type !== 'PRICE_RANGE');
	const submitForm = (event: Event) =>
		(event.currentTarget as HTMLInputElement | HTMLSelectElement).form?.requestSubmit();
</script>

<h1>{collection.title}</h1>
{#if collection.description}<p>{collection.description}</p>{/if}

<!-- Without JavaScript this is a plain GET form: the loader reads the same params. -->
<form {...formProps()} method="get" action={page.url.pathname} data-testid="collection-filters">
	{#each listFilters(collection.products.filters) as filter (filter.id)}
		<fieldset aria-busy={loading}>
			<legend>{filter.label}</legend>
			{#each filter.values as value (value.id)}
				{@const param = paramFor(value.input)}
				{#if param}
					<label>
						<input
							type="checkbox"
							name={param.name}
							value={param.value}
							checked={isFilterInputActive(state.current.filters, value.input)}
							onchange={submitForm}
						/>
						{value.label} ({value.count})
					</label>
				{/if}
			{/each}
		</fieldset>
	{/each}

	<fieldset aria-busy={loading}>
		<legend>Price</legend>
		<label>Min <input type="number" name="filter.v.price.gte" min="0" step="any" value={price?.min ?? ''} onchange={submitForm} /></label>
		<label>Max <input type="number" name="filter.v.price.lte" min="0" step="any" value={price?.max ?? ''} onchange={submitForm} /></label>
	</fieldset>

	<label>
		Sort by
		<select name="sort_by" value={sortValue} onchange={submitForm} data-testid="sort-by">
			{#each SORT_OPTIONS as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</label>

	<button type="submit">Apply</button>
	<span role="status" aria-live="polite" data-testid="collection-status">{loading ? 'Updating…' : ''}</span>
</form>

{#if state.current.filters.length > 0}
	<ul class="chips" aria-label="Active filters">
		{#each state.current.filters as filter (JSON.stringify(filter))}
			<li><a href={removalHref(filter)}>{describe(filter)} ×</a></li>
		{/each}
		<li><a href={page.url.pathname}>Clear all</a></li>
	</ul>
{/if}

<ul class="grid" class:loading data-testid="collection-products">
	{#each products as product (product.id)}
		<li data-testid="collection-product">
			<a href="/products/{product.handle}">{product.title}</a>
			<span>{formatMoney(product.priceRange.minVariantPrice)}</span>
		</li>
	{:else}
		<li>No products match these filters.</li>
	{/each}
</ul>

<nav aria-label="Pagination" class="pagination">
	{#if pageInfo.hasPreviousPage && pageInfo.startCursor}
		<a href={pageHref(page.url, { before: pageInfo.startCursor })} data-testid="previous-page">← Previous</a>
	{/if}
	{#if pageInfo.hasNextPage && pageInfo.endCursor}
		<a href={pageHref(page.url, { after: pageInfo.endCursor })} data-testid="next-page">Next →</a>
	{/if}
</nav>

<style>
	form {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: end;
	}
	fieldset {
		display: flex;
		gap: 0.75rem;
	}
	fieldset[aria-busy='true'],
	.loading {
		opacity: 0.6;
	}
	input[type='number'] {
		width: 5rem;
	}
	.chips {
		display: flex;
		gap: 0.5rem;
		padding: 0;
		list-style: none;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 1rem;
		padding: 0;
		list-style: none;
	}
	.grid li {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		border: 1px solid #ddd;
	}
	.pagination {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}
</style>
