import { gql, type StorefrontGraphqlResult } from '@shopify/hydrogen';

// The fields the product form store reads (see ProductInput in @shopify/hydrogen).
const PRODUCT_VARIANT_FRAGMENT = gql(`
	fragment ProductVariant on ProductVariant {
		id
		title
		availableForSale
		selectedOptions {
			name
			value
		}
		price {
			amount
			currencyCode
		}
		product {
			title
			handle
		}
	}
`);

export const PRODUCT_QUERY = gql(
	`
	query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
		product(handle: $handle) {
			id
			handle
			title
			description
			encodedVariantExistence
			encodedVariantAvailability
			featuredImage {
				url
				altText
			}
			priceRange {
				minVariantPrice {
					amount
					currencyCode
				}
				maxVariantPrice {
					amount
					currencyCode
				}
			}
			options {
				name
				optionValues {
					name
					firstSelectableVariant {
						...ProductVariant
					}
				}
			}
			selectedOrFirstAvailableVariant(
				selectedOptions: $selectedOptions
				ignoreUnknownOptions: true
				caseInsensitiveMatch: true
			) {
				...ProductVariant
			}
			adjacentVariants(
				selectedOptions: $selectedOptions
				ignoreUnknownOptions: true
				caseInsensitiveMatch: true
			) {
				...ProductVariant
			}
		}
	}
`,
	[PRODUCT_VARIANT_FRAGMENT]
);

export type ProductData = NonNullable<
	NonNullable<StorefrontGraphqlResult<typeof PRODUCT_QUERY>['data']>['product']
>;
