import type { PredictiveSearchStore } from '@shopify/hydrogen';
import { getContext, hasContext, setContext } from 'svelte';

const PREDICTIVE_SEARCH_CONTEXT_KEY = Symbol('hydrogen-svelte.predictive-search');

/**
 * What the provider shares. Both fields are getters: the provider replaces the store when a store
 * option changes, and `searchAction` follows its prop.
 */
export interface PredictiveSearchContextValue {
	readonly store: PredictiveSearchStore;
	readonly searchAction: string | undefined;
}

/** Shares the predictive search context with the components below. Call during component initialisation. */
export function setPredictiveSearchContext(
	value: PredictiveSearchContextValue
): PredictiveSearchContextValue {
	return setContext(PREDICTIVE_SEARCH_CONTEXT_KEY, value);
}

/** Returns the nearest provider's context, or throws an error that names the calling hook. */
export function getPredictiveSearchContext(hookName: string): PredictiveSearchContextValue {
	if (!hasContext(PREDICTIVE_SEARCH_CONTEXT_KEY)) {
		throw new Error(`${hookName} must be used inside a <PredictiveSearchProvider>.`);
	}
	return getContext<PredictiveSearchContextValue>(PREDICTIVE_SEARCH_CONTEXT_KEY);
}
