import { getSelectedProductOptions } from '@shopify/hydrogen';
import { error } from '@sveltejs/kit';

import { PRODUCT_QUERY } from '$lib/server/product-query';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { data, errors } = await locals.storefrontClient.graphql(PRODUCT_QUERY, {
		variables: {
			handle: params.handle,
			// `?Size=M` selects a variant on the server, so option links work without JavaScript.
			selectedOptions: getSelectedProductOptions({ searchParams: url.searchParams })
		}
	});
	if (!data) error(502, errors?.[0]?.message ?? 'Could not load the product');
	if (!data.product) error(404, 'Product not found');

	return { product: data.product };
};
