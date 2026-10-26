<script lang="ts">
	import {
		getPredictiveSearchItemUrl,
		getSearchResultUrl,
		type PredictiveSearchProductItem
	} from '@shopify/hydrogen';
	import {
		usePredictiveSearch,
		usePredictiveSearchActions,
		usePredictiveSearchForm
	} from 'hydrogen-svelte';

	import { routeTemplates } from '$lib/route-templates';

	const LISTBOX_ID = 'search-results';

	const search = usePredictiveSearch();
	const { clear } = usePredictiveSearchActions();
	const { formProps, register } = usePredictiveSearchForm();

	let term = $state('');
	let activeIndex = $state(-1);

	const products = $derived<PredictiveSearchProductItem[]>(
		search.current.result.items.products ?? []
	);
	const open = $derived(term.trim() !== '' && search.current.status !== 'idle');
	const optionId = (index: number) => `${LISTBOX_ID}-${index}`;

	// Closes the results. The input keeps its value: on submit, the search page shows it.
	function close() {
		term = '';
		activeIndex = -1;
		clear();
	}

	function onkeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		if (event.key === 'Escape') {
			close();
			event.currentTarget.value = '';
			return;
		}
		if (!products.length) return;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const step = event.key === 'ArrowDown' ? 1 : -1;
			activeIndex = (activeIndex + step + products.length) % products.length;
		} else if (event.key === 'Enter' && activeIndex >= 0) {
			event.preventDefault();
			document.getElementById(optionId(activeIndex))?.querySelector('a')?.click();
		}
	}
</script>

<!-- Without JavaScript this is a plain GET form to /search; once hydrated, results appear as you type. -->
<div class="search">
	<form {...formProps({ onSubmit: close })}>
		<input
			{...register('query', {
				onInput: (_event: Event, value: string) => {
					term = value;
					activeIndex = -1;
				}
			})}
			role="combobox"
			aria-label="Search products"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={LISTBOX_ID}
			aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
			placeholder="Search"
			data-testid="search-input"
			{onkeydown}
		/>
		<button type="submit">Search</button>
	</form>

	<p class="visually-hidden" aria-live="polite">
		{#if open && search.current.status === 'success'}
			{products.length} results
		{/if}
	</p>

	{#if open}
		<div class="results" data-testid="search-results">
			{#if search.current.status === 'error'}
				<p role="alert">{search.current.error}</p>
			{:else if search.current.status === 'success' && products.length === 0}
				<p data-testid="search-modal-empty">No results for “{search.current.term}”.</p>
			{/if}
			<ul id={LISTBOX_ID} role="listbox" aria-label="Products">
				{#each products as product, index (product.id)}
					<li
						id={optionId(index)}
						role="option"
						aria-selected={index === activeIndex}
						data-testid="search-result"
					>
						<a
							href={getPredictiveSearchItemUrl(product, {
								routes: routeTemplates,
								term: search.current.term
							})}
							onclick={close}>{product.title}</a
						>
					</li>
				{/each}
			</ul>
			{#if products.length}
				<a href={getSearchResultUrl({ baseUrl: '/search', term: search.current.term })} onclick={close}
					>All results</a
				>
			{/if}
		</div>
	{/if}
</div>

<style>
	.search {
		position: relative;
	}
	.results {
		position: absolute;
		right: 0;
		z-index: 1;
		min-width: 16rem;
		padding: 0.5rem;
		border: 1px solid #ddd;
		background: #fff;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	[aria-selected='true'] {
		background: #eee;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
