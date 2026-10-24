import type { CollectionStore } from '@shopify/hydrogen';
import { getContext, hasContext, setContext } from 'svelte';

const COLLECTION_CONTEXT_KEY = Symbol('hydrogen-svelte.collection');

/**
 * What the provider shares. `store` is a getter because the provider replaces the store when the
 * collection handle changes, so hooks must read it on every use instead of capturing it.
 */
export interface CollectionContextValue {
	readonly store: CollectionStore;
}

/** Shares the collection context with the components below. Call during component initialisation. */
export function setCollectionContext(value: CollectionContextValue): CollectionContextValue {
	return setContext(COLLECTION_CONTEXT_KEY, value);
}

/** Returns the nearest provider's collection context, or throws an error that names the calling hook. */
export function getCollectionContext(hookName: string): CollectionContextValue {
	if (!hasContext(COLLECTION_CONTEXT_KEY)) {
		throw new Error(`${hookName} must be used inside a <CollectionProvider>.`);
	}
	return getContext<CollectionContextValue>(COLLECTION_CONTEXT_KEY);
}
