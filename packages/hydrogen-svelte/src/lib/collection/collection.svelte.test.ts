import { createCollectionStore, type CollectionData, type CollectionStore } from '@shopify/hydrogen';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import CollectionFixture from '../test-utils/collection/CollectionFixture.svelte';
import type { CollectionApi } from '../test-utils/collection/CollectionView.svelte';
import OutsideProvider from '../test-utils/collection/OutsideProvider.svelte';

vi.mock('@shopify/hydrogen', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@shopify/hydrogen')>();
	return { ...actual, createCollectionStore: vi.fn(actual.createCollectionStore) };
});

const SHOES: CollectionData = { handle: 'shoes', dataSearch: '' };
const HATS: CollectionData = { handle: 'hats', dataSearch: '' };

type FixtureProps = Parameters<typeof CollectionFixture>[1];

async function renderCollection(props: Partial<FixtureProps> = {}) {
	let api: CollectionApi | undefined;
	const onChange = vi.fn<(search: string) => void>();
	const screen = await render(CollectionFixture, {
		data: SHOES,
		urlSearch: '',
		onChange,
		...props,
		expose: (a) => (api = a)
	});
	if (!api) throw new Error('fixture did not expose the collection API');
	return { screen, api, onChange };
}

/** The stores the provider created, oldest first. */
function createdStores(): CollectionStore[] {
	return vi.mocked(createCollectionStore).mock.results.map((r) => r.value as CollectionStore);
}

function submit(screen: Awaited<ReturnType<typeof render>>): SubmitEvent {
	const form = screen.getByTestId('filter-form').element() as HTMLFormElement;
	const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
	form.dispatchEvent(event);
	return event;
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('CollectionProvider', () => {
	it('creates a store from the data and the URL search', async () => {
		await renderCollection({ data: HATS, urlSearch: '?sort_by=price-ascending' });
		expect(createCollectionStore).toHaveBeenCalledTimes(1);
		expect(createCollectionStore).toHaveBeenCalledWith({
			data: HATS,
			urlSearch: '?sort_by=price-ascending'
		});
	});

	it('reads the starting filters and sort from the URL search', async () => {
		const { api, screen } = await renderCollection({
			urlSearch: '?filter.p.tag=sale&sort_by=price-descending'
		});
		expect(api.state.current.filters).toEqual([{ tag: 'sale' }]);
		expect(api.state.current.sortKey).toBe('PRICE');
		expect(api.state.current.reverse).toBe(true);
		await expect.element(screen.getByTestId('sort')).toHaveTextContent('PRICE:true');
	});

	it('calls onChange with the search string to navigate to after a browse change', async () => {
		const { api, onChange, screen } = await renderCollection();
		api.actions.toggleFilter({ tag: 'sale' });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('?filter.p.tag=sale');
		await expect.element(screen.getByTestId('status')).toHaveTextContent('loading');
	});

	it('keeps unrelated URL params when it builds the search string', async () => {
		const { api, onChange } = await renderCollection({ urlSearch: '?ref=nav' });
		api.actions.setSortByValue('price-ascending');
		const search = new URLSearchParams(onChange.mock.calls[0]?.[0]);
		expect(search.get('ref')).toBe('nav');
		expect(search.get('sort_by')).toBe('price-ascending');
	});

	it('settles once the loader data catches up with the URL', async () => {
		const { api, screen } = await renderCollection();
		api.actions.toggleFilter({ tag: 'sale' });

		await screen.rerender({ urlSearch: '?filter.p.tag=sale' });
		expect(api.state.current.status).toBe('loading');

		await screen.rerender({ data: { handle: 'shoes', dataSearch: '?filter.p.tag=sale' } });
		expect(api.state.current.status).toBe('idle');
		await expect.element(screen.getByTestId('status')).toHaveTextContent('idle');
	});

	it('syncs the store from external URL changes, such as back and forward', async () => {
		const { api, screen, onChange } = await renderCollection();
		await screen.rerender({ urlSearch: '?filter.p.tag=new' });
		expect(api.state.current.filters).toEqual([{ tag: 'new' }]);
		await expect
			.element(screen.getByTestId('filters'))
			.toHaveTextContent(JSON.stringify([{ tag: 'new' }]));
		expect(onChange).not.toHaveBeenCalled();
	});

	it('ignores intermediate URLs while rapid changes are in flight', async () => {
		const { api, screen, onChange } = await renderCollection();
		api.actions.toggleFilter({ tag: 'a' });
		api.actions.toggleFilter({ tag: 'b' });
		expect(onChange).toHaveBeenLastCalledWith('?filter.p.tag=a&filter.p.tag=b');

		// The router commits the first navigation after the second was dispatched.
		await screen.rerender({ urlSearch: '?filter.p.tag=a' });
		expect(api.state.current.filters).toEqual([{ tag: 'a' }, { tag: 'b' }]);
	});

	it('creates a new store when the handle changes and the hooks follow it', async () => {
		const { api, screen, onChange } = await renderCollection({ urlSearch: '?filter.p.tag=sale' });
		await screen.rerender({ data: HATS, urlSearch: '' });

		const [first, second] = createdStores();
		expect(createdStores()).toHaveLength(2);
		expect(api.state.current.handle).toBe('hats');
		expect(api.state.current.filters).toEqual([]);
		await expect.element(screen.getByTestId('handle')).toHaveTextContent('hats');

		// The old store is detached, so its changes no longer navigate.
		first?.toggleFilter({ tag: 'stale' });
		expect(onChange).not.toHaveBeenCalled();

		api.actions.toggleFilter({ tag: 'fresh' });
		expect(second?.getState().filters).toEqual([{ tag: 'fresh' }]);
		expect(onChange).toHaveBeenCalledExactlyOnceWith('?filter.p.tag=fresh');
	});

	it('uses the latest onChange prop', async () => {
		const { api, screen, onChange } = await renderCollection();
		const next = vi.fn();
		await screen.rerender({ onChange: next });
		api.actions.toggleFilter({ tag: 'sale' });
		expect(next).toHaveBeenCalledOnce();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('detaches the store on unmount', async () => {
		const { screen, onChange } = await renderCollection();
		const [store] = createdStores();
		screen.unmount();
		store?.toggleFilter({ tag: 'sale' });
		expect(onChange).not.toHaveBeenCalled();
	});
});

describe('useCollection', () => {
	it('skips updates when isEqual reports equal values', async () => {
		const { api, screen } = await renderCollection({ isEqual: () => true });
		api.actions.toggleFilter({ tag: 'sale' });
		await expect.element(screen.getByTestId('filters')).toHaveTextContent('sale');
		expect(api.status.current).toBe('idle');
		await expect.element(screen.getByTestId('status')).toHaveTextContent('idle');
	});
});

describe('useCollectionActions', () => {
	it('delegates every action to the store', async () => {
		const { api } = await renderCollection();
		api.actions.setFilters([{ tag: 'a' }, { productType: 'Shoes' }]);
		expect(api.state.current.filters).toEqual([{ tag: 'a' }, { productType: 'Shoes' }]);

		api.actions.toggleFilterInput(JSON.stringify({ tag: 'a' }));
		expect(api.state.current.filters).toEqual([{ productType: 'Shoes' }]);

		api.actions.setSortKey('TITLE', true);
		expect(api.state.current).toMatchObject({ sortKey: 'TITLE', reverse: true });

		api.actions.setSortByValue('price-ascending');
		expect(api.state.current).toMatchObject({ sortKey: 'PRICE', reverse: false });

		api.actions.reset();
		expect(api.state.current).toMatchObject({ filters: [], sortKey: undefined, reverse: false });
	});
});

describe('useCollectionForm', () => {
	it("cancels the native submission and applies the form's fields", async () => {
		const { screen, onChange, api } = await renderCollection();
		(screen.getByTestId('tag-sale').element() as HTMLInputElement).checked = true;
		(screen.getByTestId('sort-by').element() as HTMLSelectElement).value = 'price-ascending';

		const event = submit(screen);
		expect(event.defaultPrevented).toBe(true);
		expect(api.state.current).toMatchObject({ filters: [{ tag: 'sale' }], sortKey: 'PRICE' });
		const search = new URLSearchParams(onChange.mock.calls[0]?.[0]);
		expect(search.getAll('filter.p.tag')).toEqual(['sale']);
		expect(search.get('sort_by')).toBe('price-ascending');
	});

	it('calls beforeSubmit and afterSubmit with the submit event', async () => {
		const beforeSubmit = vi.fn();
		const afterSubmit = vi.fn();
		const { screen } = await renderCollection({ formOptions: { beforeSubmit, afterSubmit } });
		const event = submit(screen);
		expect(beforeSubmit).toHaveBeenCalledWith(event);
		expect(afterSubmit).toHaveBeenCalledWith(event);
	});

	it('leaves the submission alone when beforeSubmit prevents it', async () => {
		const afterSubmit = vi.fn();
		const { screen, onChange } = await renderCollection({
			formOptions: { beforeSubmit: (e) => e.preventDefault(), afterSubmit }
		});
		submit(screen);
		expect(onChange).not.toHaveBeenCalled();
		expect(afterSubmit).not.toHaveBeenCalled();
	});
});

describe('outside a CollectionProvider', () => {
	it.each(['useCollection', 'useCollectionActions', 'useCollectionForm'] as const)(
		'%s throws an error that names the hook',
		(hook) => {
			expect(() => render(OutsideProvider, { hook })).toThrow(
				`${hook === 'useCollectionForm' ? 'useCollectionActions' : hook} must be used inside a <CollectionProvider>.`
			);
		}
	);
});
