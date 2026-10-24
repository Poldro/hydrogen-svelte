import { gql, type ProductFilter, type StorefrontGraphqlResult } from '@shopify/hydrogen';
import type { ProductFilter as StorefrontApiProductFilter } from '@shopify/hydrogen/storefront-api-types';

export const COLLECTION_QUERY = gql(`
	query Collection(
		$handle: String!
		$filters: [ProductFilter!]
		$sortKey: ProductCollectionSortKeys
		$reverse: Boolean
		$first: Int
		$last: Int
		$after: String
		$before: String
	) {
		collection(handle: $handle) {
			id
			handle
			title
			description
			products(
				first: $first
				last: $last
				after: $after
				before: $before
				filters: $filters
				sortKey: $sortKey
				reverse: $reverse
			) {
				nodes {
					id
					handle
					title
					priceRange {
						minVariantPrice {
							amount
							currencyCode
						}
					}
				}
				filters {
					id
					label
					type
					values {
						id
						label
						count
						input
					}
				}
				pageInfo {
					hasNextPage
					hasPreviousPage
					startCursor
					endCursor
				}
			}
		}
	}
`);

/**
 * Converts the filters parsed from the URL to Storefront API filter inputs. Adapted from the
 * official SvelteKit example: the parsed taxonomy metafield key holds `namespace.key`.
 */
export function toStorefrontApiFilters(
	filters: ProductFilter[]
): StorefrontApiProductFilter[] | undefined {
	const converted = filters.flatMap(toStorefrontApiFilter);
	return converted.length > 0 ? converted : undefined;
}

function toStorefrontApiFilter(filter: ProductFilter): StorefrontApiProductFilter[] {
	const result: StorefrontApiProductFilter[] = [];
	if (filter.available != null) result.push({ available: filter.available });
	if (filter.category) result.push({ category: filter.category });
	if (filter.price) result.push({ price: filter.price });
	if (filter.productType != null) result.push({ productType: filter.productType });
	if (filter.productVendor != null) result.push({ productVendor: filter.productVendor });
	if (filter.tag != null) result.push({ tag: filter.tag });
	if (filter.productMetafield?.value != null) {
		const { namespace, key, value } = filter.productMetafield;
		result.push({ productMetafield: { namespace, key, value } });
	}
	if (filter.variantMetafield?.value != null) {
		const { namespace, key, value } = filter.variantMetafield;
		result.push({ variantMetafield: { namespace, key, value } });
	}
	if (filter.variantOption?.value != null) {
		const { name, value } = filter.variantOption;
		result.push({ variantOption: { name, value } });
	}
	if (filter.taxonomyMetafield) {
		const { key: fullKey, value } = filter.taxonomyMetafield;
		const dot = fullKey.indexOf('.');
		const namespace = fullKey.slice(0, dot);
		const key = fullKey.slice(dot + 1);
		if (dot > 0 && key) result.push({ taxonomyMetafield: { namespace, key, value } });
	}
	return result;
}

export type CollectionPageData = NonNullable<
	NonNullable<StorefrontGraphqlResult<typeof COLLECTION_QUERY>['data']>['collection']
>;
