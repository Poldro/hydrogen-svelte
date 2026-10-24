<script lang="ts" module>
	import type { CollectionData } from '@shopify/hydrogen';
	import type { Snippet } from 'svelte';

	export interface CollectionProviderProps {
		/** The collection handle and the search string that your loader fetched products for. */
		data: CollectionData;
		/** The current URL search string, with or without a leading `?`. Defaults to `''`. */
		urlSearch?: string;
		/**
		 * Receives the search string to navigate to after a filter or sort change, with a leading `?`
		 * or empty. Replaces the Vue provider's `change` event.
		 */
		onChange?: (searchString: string) => void;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import {
		createCollectionReconciler,
		createCollectionStore,
		type CollectionStore
	} from '@shopify/hydrogen';
	import { onDestroy, untrack } from 'svelte';

	import { setCollectionContext } from './context.js';

	let { data, urlSearch = '', onChange, children }: CollectionProviderProps = $props();

	const readUrlSearch = () => urlSearch;
	const createStore = () => createCollectionStore({ data, urlSearch: readUrlSearch() });

	const initialStore = untrack(createStore);
	let store: CollectionStore = $state.raw(initialStore);
	const reconciler = createCollectionReconciler(
		{
			getStore: () => store,
			readUrlSearch,
			emitChange: (searchString) => onChange?.(searchString)
		},
		untrack(readUrlSearch)
	);
	initialStore.setOnBrowseChange(() => reconciler.handleBrowseChange());

	setCollectionContext({
		get store() {
			return store;
		}
	});

	// A new collection gets a fresh store, so filters from the previous one don't carry over.
	function resetStore() {
		store.setOnBrowseChange(null);
		const next = createStore();
		store = next;
		reconciler.reset(readUrlSearch());
		next.setOnBrowseChange(() => reconciler.handleBrowseChange());
	}

	// Like the Vue provider's immediate watcher, reconcile once during initialisation (also on the
	// server), then before each DOM update that follows a URL or data change.
	let currentHandle = untrack(() => data.handle);
	untrack(() => reconciler.reconcile(urlSearch, data.dataSearch));

	$effect.pre(() => {
		const { handle, dataSearch } = data;
		const search = urlSearch;
		untrack(() => {
			if (handle !== currentHandle) {
				currentHandle = handle;
				resetStore();
			}
			reconciler.reconcile(search, dataSearch);
		});
	});

	onDestroy(() => store.setOnBrowseChange(null));
</script>

{@render children?.()}
