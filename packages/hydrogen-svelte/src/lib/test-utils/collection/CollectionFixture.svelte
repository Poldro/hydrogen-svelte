<script lang="ts">
	import type { CollectionData } from '@shopify/hydrogen';

	import CollectionProvider from '../../collection/CollectionProvider.svelte';
	import type { CollectionFormPropsOptions } from '../../collection/collection.svelte.js';
	import CollectionView, { type CollectionApi } from './CollectionView.svelte';

	let {
		data,
		urlSearch,
		onChange,
		formOptions,
		isEqual,
		expose
	}: {
		data: CollectionData;
		urlSearch?: string;
		onChange?: (searchString: string) => void;
		formOptions?: CollectionFormPropsOptions;
		isEqual?: (a: string, b: string) => boolean;
		expose?: (api: CollectionApi) => void;
	} = $props();
</script>

<CollectionProvider {data} {urlSearch} {onChange}>
	<CollectionView {formOptions} {isEqual} {expose} />
</CollectionProvider>
