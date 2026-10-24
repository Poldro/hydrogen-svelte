<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { CollectionProvider } from 'hydrogen-svelte';

	import CollectionBrowser from '$lib/components/CollectionBrowser.svelte';
	import { PAGINATION_PARAMS } from '$lib/pagination';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The provider keeps unrelated params. A cursor from the old results would point into a
	// different list, so a filter or sort change starts again from the first page.
	function onChange(search: string) {
		const params = new URLSearchParams(search);
		for (const name of PAGINATION_PARAMS) params.delete(name);
		const query = params.toString();
		void goto(`${page.url.pathname}${query ? `?${query}` : ''}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}
</script>

<svelte:head>
	<title>{data.collection.title} · hydrogen-svelte</title>
</svelte:head>

<CollectionProvider
	data={{ handle: data.collection.handle, dataSearch: data.dataSearch }}
	urlSearch={page.url.search}
	{onChange}
>
	<CollectionBrowser collection={data.collection} />
</CollectionProvider>
