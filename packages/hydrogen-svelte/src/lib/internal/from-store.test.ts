import { describe, expect, it } from 'vitest';

import { createFakeStore } from '../test-utils/fake-store.js';
import { fromHydrogenStore } from './from-store.js';

// Runs in the node project, where `svelte/reactivity` resolves to its server build.
describe('fromHydrogenStore (server)', () => {
	it('reads getState() and never subscribes', () => {
		const store = createFakeStore({ count: 1 });
		const value = fromHydrogenStore(store, (s) => s.count);

		expect(value.current).toBe(1);
		store.setState({ count: 2 });
		expect(value.current).toBe(2);
		expect(store.subscribeCalls).toBe(0);
	});
});
