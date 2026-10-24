import { createSubscriber } from 'svelte/reactivity';

/** The contract that every Hydrogen core store shares (cart, product form, collection, predictive search). */
export interface HydrogenStore<T> {
	getState(): T;
	subscribe(listener: (state: T) => void): () => void;
}

/** A reactive value. Reading `current` inside an effect or a template keeps it up to date. */
export interface ReactiveValue<T> {
	readonly current: T;
}

export type Selector<T, S> = (state: T) => S;
export type EqualityFn<S> = (a: S, b: S) => boolean;

/**
 * Wraps a Hydrogen store in a reactive value with an optional selector.
 *
 * Mirrors the selector semantics of the official Vue bindings: readers update only when the
 * selected value changes by `Object.is`, or when `isEqual` reports a change.
 *
 * The store subscription is lazy. It starts when the first effect or template reads `current`,
 * and stops a microtask after the last one is destroyed. During server rendering no effects run,
 * so the store is only read through `getState()` and never subscribed to.
 */
export function fromHydrogenStore<T>(store: HydrogenStore<T>): ReactiveValue<T>;
export function fromHydrogenStore<T, S>(
	store: HydrogenStore<T>,
	selector: Selector<T, S>,
	isEqual?: EqualityFn<S>
): ReactiveValue<S>;
export function fromHydrogenStore<T, S>(
	store: HydrogenStore<T>,
	selector: Selector<T, S> = (state) => state as unknown as S,
	isEqual: EqualityFn<S> = Object.is
): ReactiveValue<S> {
	let selected = selector(store.getState());
	let subscribed = false;

	// Recomputes the slice and keeps the previous reference when it's equal. Returns whether it changed.
	const sync = (): boolean => {
		const next = selector(store.getState());
		if (isEqual(selected, next)) return false;
		selected = next;
		return true;
	};

	const track = createSubscriber((update) => {
		subscribed = true;
		// The store may have changed while nobody was subscribed.
		if (sync()) update();
		const unsubscribe = store.subscribe(() => {
			if (sync()) update();
		});
		return () => {
			subscribed = false;
			unsubscribe();
		};
	});

	return {
		get current() {
			// Without a live subscription (server, a read outside any effect, or the first reactive
			// read) the cache may be stale. Syncing before `track()` keeps `start` from invalidating
			// the effect that is reading right now.
			if (!subscribed) sync();
			track();
			return selected;
		}
	};
}
