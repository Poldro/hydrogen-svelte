import type { CartState, CartStore } from '@shopify/hydrogen';
import { vi } from 'vitest';

import { createFakeStore } from '../fake-store.js';

export type MockCartStore = CartStore & {
	setState(state: CartState): void;
	readonly listenerCount: number;
};

/** A cart store double whose actions are spies and whose state the test drives. */
export function createMockCartStore(initial: CartState): MockCartStore {
	const fake = createFakeStore(initial);
	return {
		connect: vi.fn(),
		destroy: vi.fn(),
		hydrate: vi.fn(),
		getState: vi.fn(fake.getState),
		subscribe: vi.fn(fake.subscribe),
		fetch: vi.fn(() => Promise.resolve()),
		refresh: vi.fn(),
		reset: vi.fn(),
		handleFormSubmit: vi.fn(() => Promise.resolve()),
		setState: fake.setState,
		get listenerCount() {
			return fake.listenerCount;
		}
	};
}
