import { gql } from '@shopify/hydrogen';
import { error } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

const PRODUCTS_QUERY = gql(`
	query HomeProducts {
		products(first: 12) {
			nodes {
				id
				handle
				title
				featuredImage {
					url
					altText
				}
				variants(first: 1) {
					nodes {
						id
						availableForSale
						price {
							amount
							currencyCode
						}
					}
				}
			}
		}
	}
`);

export const load: PageServerLoad = async ({ locals }) => {
	const { data, errors } = await locals.storefrontClient.graphql(PRODUCTS_QUERY);
	if (!data) error(502, errors?.[0]?.message ?? 'Could not load products');

	return {
		products: data.products.nodes.flatMap((product) => {
			const variant = product.variants.nodes[0];
			return variant ? [{ ...product, variant }] : [];
		})
	};
};
