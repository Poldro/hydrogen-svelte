import type { CollectionActions, CollectionData, CollectionState } from '@shopify/hydrogen';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';

import {
	fromHydrogenStore,
	type EqualityFn,
	type ReactiveValue,
	type Selector
} from '../internal/from-store.js';
import { getCollectionContext } from './context.js';

export type { CollectionActions, CollectionData, CollectionState };
export { default as CollectionProvider } from './CollectionProvider.svelte';

/**
 * Returns collection state as a reactive value. Read `current` in a template or an effect.
 *
 * `current` follows the new store when the provider replaces it on a handle change. With a
 * selector, readers update only when the selected value changes by reference or when `isEqual`
 * reports a change. Throws outside a `<CollectionProvider>`.
 *
 * @example
 * ```svelte
 * <script>
 *   const status = useCollection((s) => s.status);
 * </script>
 *
 * <p aria-busy={status.current === 'loading'}>…</p>
 * ```
 */
export function useCollection(): ReactiveValue<CollectionState>;
export function useCollection<S>(
	selector: Selector<CollectionState, S>,
	isEqual?: EqualityFn<S>
): ReactiveValue<S>;
export function useCollection<S>(
	selector?: Selector<CollectionState, S>,
	isEqual?: EqualityFn<S>
): ReactiveValue<S | CollectionState> {
	const ctx = getCollectionContext('useCollection');
	// A new reactive value per store: the derived re-runs only when the provider swaps the store.
	const value = $derived(
		selector ? fromHydrogenStore(ctx.store, selector, isEqual) : fromHydrogenStore(ctx.store)
	);
	return {
		get current() {
			return value.current;
		}
	};
}

/**
 * Returns methods that change filters and sort. After each change, the provider calls `onChange`
 * with the new search string. The methods always act on the provider's current store.
 * Throws outside a `<CollectionProvider>`.
 */
export function useCollectionActions(): CollectionActions {
	const ctx = getCollectionContext('useCollectionActions');
	return {
		setFilters: (...args) => ctx.store.setFilters(...args),
		toggleFilter: (...args) => ctx.store.toggleFilter(...args),
		toggleFilterInput: (...args) => ctx.store.toggleFilterInput(...args),
		setSortKey: (...args) => ctx.store.setSortKey(...args),
		setSortByValue: (...args) => ctx.store.setSortByValue(...args),
		reset: (...args) => ctx.store.reset(...args),
		handleFormSubmit: (...args) => ctx.store.handleFormSubmit(...args)
	};
}

export interface CollectionFormPropsOptions {
	/** Runs before the store reads the form. Call `event.preventDefault()` to keep the native submission. */
	beforeSubmit?: (event: SubmitEvent) => void;
	/** Runs after the store applies the form's filter and sort fields. */
	afterSubmit?: (event: SubmitEvent) => void;
}

/** Attributes to spread on a collection filter `<form>`. The symbol key holds the submit attachment. */
export type CollectionFormProps = {
	[attachment: symbol]: Attachment<HTMLFormElement>;
};

export interface UseCollectionFormResult {
	formProps(options?: CollectionFormPropsOptions): CollectionFormProps;
}

/**
 * Returns form props that progressively enhance a collection filter form.
 *
 * Give the form `method="get"` and the collection path as `action`, so that it filters without
 * JavaScript. Once hydrated, the attachment cancels the native submission and applies the form's
 * `filter.*` and `sort_by` fields to the store. Throws outside a `<CollectionProvider>`.
 *
 * @example
 * ```svelte
 * <script>
 *   const { formProps } = useCollectionForm();
 * </script>
 *
 * <form {...formProps()} method="get" action="/collections/shoes">
 *   <input type="checkbox" name="filter.p.tag" value="sale" />
 *   <button type="submit">Apply</button>
 * </form>
 * ```
 */
export function useCollectionForm(): UseCollectionFormResult {
	const actions = useCollectionActions();
	const submitKey = createAttachmentKey();

	const submitWith =
		(options?: CollectionFormPropsOptions): Attachment<HTMLFormElement> =>
		(form) => {
			const onSubmit = (event: SubmitEvent) => {
				options?.beforeSubmit?.(event);
				if (event.defaultPrevented) return;
				event.preventDefault();
				actions.handleFormSubmit(event);
				options?.afterSubmit?.(event);
			};
			form.addEventListener('submit', onSubmit);
			return () => form.removeEventListener('submit', onSubmit);
		};

	return {
		formProps: (options) => ({ [submitKey]: submitWith(options) })
	};
}
