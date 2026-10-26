import {
	createPredictiveSearchStore,
	type PredictiveSearchData,
	type PredictiveSearchState,
	type PredictiveSearchStore
} from '@shopify/hydrogen';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import OutsideProvider from '../test-utils/predictive-search/OutsideProvider.svelte';
import SearchFixture from '../test-utils/predictive-search/SearchFixture.svelte';
import type { SearchApi } from '../test-utils/predictive-search/SearchView.svelte';

vi.mock('@shopify/hydrogen', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@shopify/hydrogen')>();
	return { ...actual, createPredictiveSearchStore: vi.fn() };
});

type MockStore = PredictiveSearchStore & {
	setState(state: PredictiveSearchState): void;
};

function makeState(overrides: Partial<PredictiveSearchState> = {}): PredictiveSearchState {
	return {
		term: '',
		status: 'idle',
		result: {
			term: '',
			total: 0,
			items: {}
		} as unknown as PredictiveSearchData,
		error: null,
		...overrides
	};
}

function createMockStore(): MockStore {
	let state = makeState();
	const listeners = new Set<(s: PredictiveSearchState) => void>();
	return {
		connect: vi.fn(),
		getState: vi.fn(() => state),
		subscribe: vi.fn((fn: (s: PredictiveSearchState) => void) => {
			listeners.add(fn);
			return () => listeners.delete(fn);
		}),
		search: vi.fn(() => Promise.resolve()),
		clear: vi.fn(),
		destroy: vi.fn(),
		setState(next: PredictiveSearchState) {
			state = next;
			for (const fn of listeners) fn(state);
		}
	} as unknown as MockStore;
}

/** The stores the provider created, oldest first. */
function createdStores(): MockStore[] {
	return vi.mocked(createPredictiveSearchStore).mock.results.map((r) => r.value as MockStore);
}

function latestStore(): MockStore {
	return createdStores().at(-1)!;
}

type FixtureProps = Parameters<typeof SearchFixture>[1];

async function renderSearch(props: Partial<FixtureProps> = {}) {
	let api: SearchApi | undefined;
	const screen = await render(SearchFixture, {
		...props,
		expose: (a) => (api = a)
	});
	if (!api) throw new Error('fixture did not expose the search API');
	return { screen, api };
}

function form(screen: Awaited<ReturnType<typeof render>>): HTMLFormElement {
	return screen.getByTestId('search-form').element() as HTMLFormElement;
}

function input(screen: Awaited<ReturnType<typeof render>>): HTMLInputElement {
	return screen.getByTestId('query').element() as HTMLInputElement;
}

function submit(screen: Awaited<ReturnType<typeof render>>): SubmitEvent {
	const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
	form(screen).dispatchEvent(event);
	return event;
}

function type(screen: Awaited<ReturnType<typeof render>>, value: string): void {
	const el = input(screen);
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(createPredictiveSearchStore).mockImplementation(() => createMockStore());
});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('PredictiveSearchProvider', () => {
	it('creates a store with the default options', async () => {
		await renderSearch();
		expect(createPredictiveSearchStore).toHaveBeenCalledTimes(1);
		expect(createPredictiveSearchStore).toHaveBeenCalledWith({
			predictiveSearchEndpoint: undefined,
			debounceInMs: undefined,
			minTermLength: undefined,
			fetch: undefined,
			limit: undefined,
			limitScope: undefined,
			types: undefined,
			searchableFields: undefined,
			unavailableProducts: undefined
		});
	});

	it('passes the store options to the store factory', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		await renderSearch({
			predictiveSearchEndpoint: '/api/search',
			debounceInMs: 300,
			minTermLength: 2,
			fetch,
			limit: 5,
			limitScope: 'ALL',
			types: ['PRODUCT'],
			searchableFields: ['TITLE'],
			unavailableProducts: 'LAST'
		});
		expect(createPredictiveSearchStore).toHaveBeenCalledWith({
			predictiveSearchEndpoint: '/api/search',
			debounceInMs: 300,
			minTermLength: 2,
			fetch,
			limit: 5,
			limitScope: 'ALL',
			types: ['PRODUCT'],
			searchableFields: ['TITLE'],
			unavailableProducts: 'LAST'
		});
	});

	it('connects the store on mount and destroys it on unmount', async () => {
		const { screen } = await renderSearch();
		const store = latestStore();
		expect(store.connect).toHaveBeenCalledTimes(1);
		expect(store.destroy).not.toHaveBeenCalled();
		screen.unmount();
		expect(store.destroy).toHaveBeenCalledTimes(1);
	});

	it('destroys the store and creates a connected one when a store option changes', async () => {
		const { screen } = await renderSearch({ limit: 5 });
		const first = latestStore();
		await screen.rerender({ limit: 10 });
		expect(createdStores()).toHaveLength(2);
		expect(first.destroy).toHaveBeenCalledTimes(1);
		expect(latestStore().connect).toHaveBeenCalledTimes(1);
		expect(createPredictiveSearchStore).toHaveBeenLastCalledWith(
			expect.objectContaining({ limit: 10 })
		);
	});

	it('keeps the store when a new array has the same items', async () => {
		const { screen } = await renderSearch({ types: ['PRODUCT', 'COLLECTION'] });
		await screen.rerender({ types: ['PRODUCT', 'COLLECTION'] });
		expect(createdStores()).toHaveLength(1);
		await screen.rerender({ types: ['PRODUCT'] });
		expect(createdStores()).toHaveLength(2);
	});

	it('keeps the store when only searchAction changes, and updates the form action', async () => {
		const { screen } = await renderSearch({ searchAction: '/search' });
		await screen.rerender({ searchAction: '/new-search' });
		expect(createdStores()).toHaveLength(1);
		expect(latestStore().destroy).not.toHaveBeenCalled();
		expect(form(screen).getAttribute('action')).toBe('/new-search');
	});
});

describe('usePredictiveSearch', () => {
	it('returns the full state, or the selected slice', async () => {
		const { api } = await renderSearch();
		expect(api.state.current).toEqual(makeState());
		expect(api.term.current).toBe('');
	});

	it('updates the template when the state changes', async () => {
		const { screen } = await renderSearch();
		latestStore().setState(makeState({ term: 'tea', status: 'loading' }));
		await expect.element(screen.getByTestId('status')).toHaveTextContent('loading');
		await expect.element(screen.getByTestId('term')).toHaveTextContent('tea');
	});

	it('skips updates when isEqual reports no change', async () => {
		const { screen } = await renderSearch({ isEqual: () => true });
		latestStore().setState(makeState({ term: 'tea', status: 'loading' }));
		await expect.element(screen.getByTestId('status')).toHaveTextContent('loading');
		expect(screen.getByTestId('term').element().textContent).toBe('');
	});

	it('follows the new store after the provider replaces it', async () => {
		const { screen, api } = await renderSearch({ limit: 5 });
		await screen.rerender({ limit: 10 });
		latestStore().setState(makeState({ term: 'mug' }));
		await expect.element(screen.getByTestId('term')).toHaveTextContent('mug');
		expect(api.term.current).toBe('mug');
	});
});

describe('usePredictiveSearchActions', () => {
	it('delegates search and clear to the store', async () => {
		const { api } = await renderSearch();
		await api.actions.search('tea');
		api.actions.clear();
		expect(latestStore().search).toHaveBeenCalledWith('tea');
		expect(latestStore().clear).toHaveBeenCalledTimes(1);
	});

	it('delegates to the latest store after the provider replaces it', async () => {
		const { screen, api } = await renderSearch({ limit: 5 });
		const first = latestStore();
		await screen.rerender({ limit: 10 });
		await api.actions.search('tea');
		expect(first.search).not.toHaveBeenCalled();
		expect(latestStore().search).toHaveBeenCalledWith('tea');
	});
});

describe('usePredictiveSearchForm', () => {
	it('renders the core form and input attributes with lowercase names', async () => {
		const { screen } = await renderSearch();
		const f = form(screen);
		expect(f.getAttribute('action')).toBe('/search');
		expect(f.getAttribute('method')).toBe('get');
		expect(f.getAttribute('role')).toBe('search');
		const el = input(screen);
		expect(el.name).toBe('q');
		expect(el.type).toBe('search');
		expect(el.getAttribute('autocomplete')).toBe('off');
		expect(el.getAttribute('autocapitalize')).toBe('off');
		expect(el.getAttribute('spellcheck')).toBe('false');
	});

	it('searches on input and passes the term to onInput', async () => {
		const onInput = vi.fn();
		const { screen } = await renderSearch({ inputOptions: { onInput } });
		type(screen, 'tea');
		expect(onInput).toHaveBeenCalledWith(expect.any(Event), 'tea');
		expect(latestStore().search).toHaveBeenCalledWith('tea');
	});

	it('skips the search when onInput prevents the default', async () => {
		const { screen } = await renderSearch({
			inputOptions: { onInput: (event: Event) => event.preventDefault() }
		});
		type(screen, 'tea');
		expect(latestStore().search).not.toHaveBeenCalled();
	});

	it('merges extra attributes on the input and the form', async () => {
		const { api } = await renderSearch();
		expect(api.form.register('query', { placeholder: 'Search' })).toEqual(
			expect.objectContaining({
				name: 'q',
				type: 'search',
				placeholder: 'Search'
			})
		);
		expect(api.form.formProps({ class: 'search-form', action: '/find' })).toEqual(
			expect.objectContaining({
				action: '/find',
				method: 'get',
				role: 'search',
				class: 'search-form'
			})
		);
	});

	it('lets the native submission through by default', async () => {
		const onSubmit = vi.fn();
		const { screen } = await renderSearch({ formOptions: { onSubmit } });
		input(screen).value = 'tea';
		// Cancel the navigation in the test, after the attachment's listener has run.
		form(screen).addEventListener('submit', (e) => e.preventDefault(), {
			once: true
		});
		const event = submit(screen);
		expect(onSubmit).toHaveBeenCalledWith(event, 'tea');
		expect(latestStore().search).not.toHaveBeenCalled();
	});

	it('searches on the client when preventDefault is set', async () => {
		const { screen } = await renderSearch({
			formOptions: { preventDefault: true }
		});
		input(screen).value = 'tea';
		const event = submit(screen);
		expect(event.defaultPrevented).toBe(true);
		expect(latestStore().search).toHaveBeenCalledWith('tea');
	});

	it('skips the client search when onSubmit prevents the default', async () => {
		const { screen } = await renderSearch({
			formOptions: {
				preventDefault: true,
				onSubmit: (event: SubmitEvent) => event.preventDefault()
			}
		});
		input(screen).value = 'tea';
		submit(screen);
		expect(latestStore().search).not.toHaveBeenCalled();
	});
});

describe('outside a provider', () => {
	it.each([
		'usePredictiveSearch',
		'usePredictiveSearchActions',
		'usePredictiveSearchForm'
	] as const)('%s throws', (hook) => {
		expect(() => render(OutsideProvider, { hook })).toThrow(
			`${hook} must be used inside a <PredictiveSearchProvider>.`
		);
	});
});
