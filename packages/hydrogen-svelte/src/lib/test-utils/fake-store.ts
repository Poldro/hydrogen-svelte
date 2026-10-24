import type { HydrogenStore } from '../internal/from-store.js';

export type FakeStore<T> = HydrogenStore<T> & {
	/** Replaces the state and notifies every listener, like the core observable. */
	setState(next: T): void;
	/** Number of `subscribe` calls so far. */
	readonly subscribeCalls: number;
	/** Number of listeners currently attached. */
	readonly listenerCount: number;
};

/** A minimal store with the `getState`/`subscribe` contract of every Hydrogen core store. */
export function createFakeStore<T>(initial: T): FakeStore<T> {
	let state = initial;
	let listeners: Array<(state: T) => void> = [];
	let subscribeCalls = 0;

	return {
		getState: () => state,
		subscribe(listener) {
			subscribeCalls += 1;
			listeners = [...listeners, listener];
			return () => {
				listeners = listeners.filter((l) => l !== listener);
			};
		},
		setState(next) {
			if (Object.is(state, next)) return;
			state = next;
			for (const listener of listeners) listener(state);
		},
		get subscribeCalls() {
			return subscribeCalls;
		},
		get listenerCount() {
			return listeners.length;
		}
	};
}
