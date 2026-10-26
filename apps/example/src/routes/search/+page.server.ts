import { queryPredictiveSearch } from '@shopify/hydrogen';
import { error } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

const SEARCH_LIMIT = 10;

// The results page for the search form's native GET submission, so search works without
// JavaScript. It reuses the predictive search query; a full store would run the Storefront API
// `search` query with pagination.
export const load: PageServerLoad = async ({ locals, url }) => {
	const term = url.searchParams.get('q')?.trim() ?? '';
	const result = await queryPredictiveSearch({
		storefrontClient: locals.storefrontClient,
		term,
		limit: SEARCH_LIMIT,
		types: ['PRODUCT']
	}).catch((cause: unknown) =>
		error(502, cause instanceof Error ? cause.message : 'Could not load search results')
	);
	return { term, products: result.items.products };
};
