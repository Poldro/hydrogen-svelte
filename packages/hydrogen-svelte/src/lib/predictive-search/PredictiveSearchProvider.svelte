<script lang="ts" module>
	import type { CreatePredictiveSearchStoreOptions } from '@shopify/hydrogen';
	import type { Snippet } from 'svelte';

	export interface PredictiveSearchProviderProps extends CreatePredictiveSearchStoreOptions {
		/** The search results route that the form submits to. Defaults to `/search`. */
		searchAction?: string;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { createPredictiveSearchStore, type PredictiveSearchStore } from '@shopify/hydrogen';
	import { onDestroy, onMount, untrack } from 'svelte';

	import { setPredictiveSearchContext } from './context.js';

	const ARRAY_SEPARATOR = '\0';

	let {
		predictiveSearchEndpoint,
		searchAction,
		debounceInMs,
		minTermLength,
		fetch,
		limit,
		limitScope,
		types,
		searchableFields,
		unavailableProducts,
		children
	}: PredictiveSearchProviderProps = $props();

	const buildOptions = (): CreatePredictiveSearchStoreOptions => ({
		predictiveSearchEndpoint,
		debounceInMs,
		minTermLength,
		fetch,
		limit,
		limitScope,
		types,
		searchableFields,
		unavailableProducts
	});

	let store: PredictiveSearchStore = $state.raw(
		untrack(() => createPredictiveSearchStore(buildOptions()))
	);

	setPredictiveSearchContext({
		get store() {
			return store;
		},
		get searchAction() {
			return searchAction;
		}
	});

	// Arrays compare by value, like the Vue provider, so a new array literal on every render
	// doesn't replace the store.
	const optionsKey = $derived([
		predictiveSearchEndpoint,
		debounceInMs,
		minTermLength,
		limit,
		limitScope,
		types?.join(ARRAY_SEPARATOR) ?? '',
		searchableFields?.join(ARRAY_SEPARATOR) ?? '',
		unavailableProducts
	].join(ARRAY_SEPARATOR));
	let currentKey = untrack(() => optionsKey);
	let currentFetch = untrack(() => fetch);

	$effect.pre(() => {
		const key = optionsKey;
		const nextFetch = fetch;
		if (key === currentKey && nextFetch === currentFetch) return;
		currentKey = key;
		currentFetch = nextFetch;
		untrack(() => {
			store.destroy();
			const next = createPredictiveSearchStore(buildOptions());
			next.connect();
			store = next;
		});
	});

	onMount(() => store.connect());
	onDestroy(() => store.destroy());
</script>

{@render children?.()}
