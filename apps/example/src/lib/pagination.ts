export const COLLECTION_PAGE_SIZE = 2;

/** Search params for cursor pagination. Filter and sort changes drop them (see the collection page). */
export const PAGINATION_PARAMS = ['after', 'before'] as const;

/** Variables for one page of products: `?after=` moves forward, `?before=` moves back. */
export function paginationVariables(searchParams: URLSearchParams) {
	const before = searchParams.get('before');
	if (before) return { last: COLLECTION_PAGE_SIZE, before };
	return { first: COLLECTION_PAGE_SIZE, after: searchParams.get('after') ?? undefined };
}

/** The current URL with one pagination cursor, keeping the filter and sort params. */
export function pageHref(url: URL, cursor: { after: string } | { before: string }): string {
	const params = new URLSearchParams(url.search);
	for (const name of PAGINATION_PARAMS) params.delete(name);
	for (const [name, value] of Object.entries(cursor)) params.set(name, value);
	return `${url.pathname}?${params}`;
}
