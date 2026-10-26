import {
	createPredictiveSearchFormRegister,
	getPredictiveSearchFormAttributes,
	readPredictiveSearchFormTerm,
	type PredictiveSearchActions,
	type PredictiveSearchData,
	type PredictiveSearchFormAttributes,
	type PredictiveSearchState,
	type PredictiveSearchStore
} from '@shopify/hydrogen';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';

import {
	fromHydrogenStore,
	type EqualityFn,
	type ReactiveValue,
	type Selector
} from '../internal/from-store.js';
import { getPredictiveSearchContext } from './context.js';

export type { PredictiveSearchActions, PredictiveSearchData, PredictiveSearchState };
export { default as PredictiveSearchProvider } from './PredictiveSearchProvider.svelte';

/**
 * Returns predictive search state as a reactive value. Read `current` in a template or an effect.
 *
 * `current` follows the new store when the provider replaces it. With a selector, readers update
 * only when the selected value changes by reference or when `isEqual` reports a change.
 * Throws outside a `<PredictiveSearchProvider>`.
 *
 * @example
 * ```svelte
 * <script>
 *   const products = usePredictiveSearch((s) => s.result.items.products);
 * </script>
 * ```
 */
export function usePredictiveSearch<
	TData extends PredictiveSearchData = PredictiveSearchData
>(): ReactiveValue<PredictiveSearchState<TData>>;
export function usePredictiveSearch<
	TData extends PredictiveSearchData = PredictiveSearchData,
	S = PredictiveSearchState<TData>
>(selector: Selector<PredictiveSearchState<TData>, S>, isEqual?: EqualityFn<S>): ReactiveValue<S>;
export function usePredictiveSearch<
	TData extends PredictiveSearchData = PredictiveSearchData,
	S = PredictiveSearchState<TData>
>(
	selector?: Selector<PredictiveSearchState<TData>, S>,
	isEqual?: EqualityFn<S>
): ReactiveValue<S | PredictiveSearchState<TData>> {
	const ctx = getPredictiveSearchContext('usePredictiveSearch');
	// A new reactive value per store: the derived re-runs only when the provider swaps the store.
	const value = $derived.by(() => {
		const store = ctx.store as unknown as PredictiveSearchStore<TData>;
		return selector ? fromHydrogenStore(store, selector, isEqual) : fromHydrogenStore(store);
	});
	return {
		get current() {
			return value.current;
		}
	};
}

/**
 * Returns methods that search and clear results in the provider's current store.
 * Throws outside a `<PredictiveSearchProvider>`.
 */
export function usePredictiveSearchActions(): PredictiveSearchActions {
	const ctx = getPredictiveSearchContext('usePredictiveSearchActions');
	return {
		search: (term) => ctx.store.search(term),
		clear: () => ctx.store.clear()
	};
}

/**
 * Options for `formProps()`. Any other key is spread on the form, and overrides the default
 * `action`, `method` and `role`.
 */
export interface PredictiveSearchFormPropsOptions {
	/** Set to `true` to cancel the native submission and search on the client with the submitted term. */
	preventDefault?: boolean;
	/** Runs on submit. Call `event.preventDefault()` to cancel both the native submission and the client search. */
	onSubmit?: (event: SubmitEvent, term: string) => void;
	[attribute: string]: unknown;
}

/** Options for `register('query')`. Any other key is spread on the input. */
export interface PredictiveSearchQueryInputPropsOptions {
	/** Runs on input. Call `event.preventDefault()` to skip the automatic search. */
	onInput?: (event: Event, term: string) => void;
	[attribute: string]: unknown;
}

/** Attributes to spread on the search `<form>`. The symbol key holds the submit attachment. */
export type PredictiveSearchFormProps = PredictiveSearchFormAttributes & {
	[attribute: string]: unknown;
	[attachment: symbol]: Attachment<HTMLFormElement>;
};

/**
 * Attributes to spread on the query `<input>`. Unlike the core attributes, the names are the
 * lowercase HTML ones, because Svelte spreads them as written.
 */
export interface PredictiveSearchQueryInputProps {
	name: 'q';
	type: 'search';
	autocomplete: 'off';
	autocapitalize: 'off';
	spellcheck: 'false';
	oninput: (event: Event) => void;
	[attribute: string]: unknown;
}

export interface PredictiveSearchFormResult {
	/** Returns the form attributes: the search action, `method="get"`, `role="search"`, and the submit attachment. */
	formProps(options?: PredictiveSearchFormPropsOptions): PredictiveSearchFormProps;
	/** Returns the query input attributes, with an input handler that searches on every input. Throws for any field but `query`. */
	register(
		field: 'query',
		options?: PredictiveSearchQueryInputPropsOptions
	): PredictiveSearchQueryInputProps;
}

/**
 * Returns functions that build a predictive search form that works without JavaScript.
 *
 * Without JavaScript the form submits `?q=` to the search action. Once hydrated, the input
 * searches as the customer types. Throws outside a `<PredictiveSearchProvider>`.
 *
 * @example
 * ```svelte
 * <script>
 *   const { formProps, register } = usePredictiveSearchForm();
 * </script>
 *
 * <form {...formProps()}>
 *   <input {...register('query')} aria-label="Search" />
 * </form>
 * ```
 */
export function usePredictiveSearchForm(): PredictiveSearchFormResult {
	const ctx = getPredictiveSearchContext('usePredictiveSearchForm');
	const coreRegister = createPredictiveSearchFormRegister();
	const submitKey = createAttachmentKey();

	function register(
		field: 'query',
		options: PredictiveSearchQueryInputPropsOptions = {}
	): PredictiveSearchQueryInputProps {
		const { onInput, ...attributes } = options;
		const { name, type } = coreRegister(field);
		return {
			...attributes,
			name,
			type,
			autocomplete: 'off',
			autocapitalize: 'off',
			spellcheck: 'false',
			oninput: (event) => {
				const term = (event.currentTarget as HTMLInputElement).value;
				onInput?.(event, term);
				if (event.defaultPrevented) return;
				void ctx.store.search(term);
			}
		};
	}

	const submitWith =
		(
			onSubmit: PredictiveSearchFormPropsOptions['onSubmit'],
			preventDefault: boolean | undefined
		): Attachment<HTMLFormElement> =>
		(form) => {
			const handleSubmit = (event: SubmitEvent) => {
				const term = readPredictiveSearchFormTerm(new FormData(form));
				onSubmit?.(event, term);
				if (event.defaultPrevented || !preventDefault) return;
				event.preventDefault();
				void ctx.store.search(term);
			};
			form.addEventListener('submit', handleSubmit);
			return () => form.removeEventListener('submit', handleSubmit);
		};

	function formProps(options: PredictiveSearchFormPropsOptions = {}): PredictiveSearchFormProps {
		const { onSubmit, preventDefault, ...attributes } = options;
		return {
			...getPredictiveSearchFormAttributes(ctx.searchAction),
			...attributes,
			[submitKey]: submitWith(onSubmit, preventDefault)
		};
	}

	return { formProps, register };
}
