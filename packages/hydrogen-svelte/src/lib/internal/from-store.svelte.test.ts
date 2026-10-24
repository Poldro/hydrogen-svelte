import { flushSync, tick } from 'svelte';
import { describe, expect, it } from 'vitest';

import { createFakeStore } from '../test-utils/fake-store.js';
import { fromHydrogenStore } from './from-store.js';

type State = { count: number; items: string[]; label: string };

const initial = (): State => ({ count: 0, items: ['a'], label: 'x' });

/** Runs `read` inside an effect and records every value it produces. */
function track<S>(read: () => S) {
	const values: S[] = [];
	const destroy = $effect.root(() => {
		$effect(() => {
			values.push(read());
		});
	});
	flushSync();
	return { values, destroy };
}

/** Lets the microtask that createSubscriber uses for teardown run. */
const settle = () => tick().then(() => Promise.resolve());

describe('fromHydrogenStore (client)', () => {
	it('returns the full state without a selector', () => {
		const store = createFakeStore(initial());
		const value = fromHydrogenStore(store);
		expect(value.current).toBe(store.getState());
	});

	it('returns the selected slice', () => {
		const store = createFakeStore(initial());
		const value = fromHydrogenStore(store, (s) => s.count);
		expect(value.current).toBe(0);
	});

	it('does not subscribe on a non-reactive read but still returns fresh state', () => {
		const store = createFakeStore(initial());
		const value = fromHydrogenStore(store, (s) => s.count);
		store.setState({ ...store.getState(), count: 5 });
		expect(value.current).toBe(5);
		expect(store.subscribeCalls).toBe(0);
	});

	it('subscribes once for several reactive readers and unsubscribes after the last one', async () => {
		const store = createFakeStore(initial());
		const value = fromHydrogenStore(store, (s) => s.count);

		const a = track(() => value.current);
		const b = track(() => value.current);
		expect(store.subscribeCalls).toBe(1);
		expect(store.listenerCount).toBe(1);

		a.destroy();
		await settle();
		expect(store.listenerCount).toBe(1);

		b.destroy();
		await settle();
		expect(store.listenerCount).toBe(0);
	});

	it('re-runs readers only when the selected slice changes', () => {
		const store = createFakeStore(initial());
		const value = fromHydrogenStore(store, (s) => s.count);
		const { values, destroy } = track(() => value.current);

		store.setState({ ...store.getState(), label: 'y' });
		flushSync();
		store.setState({ ...store.getState(), count: 1 });
		flushSync();

		expect(values).toEqual([0, 1]);
		destroy();
	});

	it('uses Object.is by default, so a new array reference triggers an update', () => {
		const store = createFakeStore(initial());
		const value = fromHydrogenStore(store, (s) => s.items);
		const { values, destroy } = track(() => value.current);

		store.setState({ ...store.getState(), items: ['a'] });
		flushSync();

		expect(values).toHaveLength(2);
		destroy();
	});

	it('skips updates that a custom isEqual reports as equal and keeps the previous reference', () => {
		const store = createFakeStore(initial());
		const sameItems = (a: string[], b: string[]) =>
			a.length === b.length && a.every((item, i) => item === b[i]);
		const value = fromHydrogenStore(store, (s) => s.items, sameItems);
		const first = value.current;
		const { values, destroy } = track(() => value.current);

		store.setState({ ...store.getState(), items: ['a'] });
		flushSync();
		expect(values).toEqual([first]);
		expect(value.current).toBe(first);

		store.setState({ ...store.getState(), items: ['a', 'b'] });
		flushSync();
		expect(values).toEqual([first, ['a', 'b']]);
		destroy();
	});

	it('keeps the previous reference on non-reactive reads when isEqual matches', () => {
		const store = createFakeStore(initial());
		const value = fromHydrogenStore(store, (s) => [...s.items], (a, b) => a.join() === b.join());
		const first = value.current;
		expect(value.current).toBe(first);
	});

	it('picks up changes that happened while nobody was subscribed', async () => {
		const store = createFakeStore(initial());
		const value = fromHydrogenStore(store, (s) => s.count);

		const first = track(() => value.current);
		first.destroy();
		await settle();

		store.setState({ ...store.getState(), count: 7 });
		const second = track(() => value.current);
		expect(second.values).toEqual([7]);

		store.setState({ ...store.getState(), count: 8 });
		flushSync();
		expect(second.values).toEqual([7, 8]);
		second.destroy();
	});

	it('works inside $derived', () => {
		const store = createFakeStore(initial());
		const value = fromHydrogenStore(store, (s) => s.count);
		const doubled = $derived(value.current * 2);
		const { values, destroy } = track(() => doubled);

		store.setState({ ...store.getState(), count: 2 });
		flushSync();

		expect(values).toEqual([0, 4]);
		destroy();
	});
});
