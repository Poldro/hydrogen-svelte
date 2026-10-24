import { parseCollectionParams } from '@shopify/hydrogen';
import { error } from '@sveltejs/kit';

import { paginationVariables } from '$lib/pagination';
import { COLLECTION_QUERY, toStorefrontApiFilters } from '$lib/server/collection-query';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const parsed = parseCollectionParams(url.searchParams);
	const { data, errors } = await locals.storefrontClient.graphql(COLLECTION_QUERY, {
		variables: {
			handle: params.handle,
			filters: toStorefrontApiFilters(parsed.filters),
			sortKey: parsed.sortKey,
			reverse: parsed.reverse || undefined,
			...paginationVariables(url.searchParams)
		}
	});
	if (!data) error(502, errors?.[0]?.message ?? 'Could not load the collection');
	if (!data.collection) error(404, 'Collection not found');

	// The provider settles its loading state once `dataSearch` matches the URL it navigated to.
	return { collection: data.collection, dataSearch: url.search };
};
