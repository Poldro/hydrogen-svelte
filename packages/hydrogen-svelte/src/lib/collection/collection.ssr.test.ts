import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import CollectionFixture from '../test-utils/collection/CollectionFixture.svelte';

describe('CollectionProvider (server)', () => {
	it('renders the filters and sort from the URL into a form that works without JavaScript', () => {
		const { body } = render(CollectionFixture, {
			props: {
				data: { handle: 'shoes', dataSearch: '?filter.p.tag=sale' },
				urlSearch: '?filter.p.tag=sale&sort_by=price-ascending'
			}
		});
		expect(body).toContain('<span data-testid="handle">shoes</span>');
		expect(body).toContain('<span data-testid="status">idle</span>');
		expect(body).toContain('<span data-testid="sort">PRICE:false</span>');
		expect(body).toContain('<span data-testid="filters">[{"tag":"sale"}]</span>');
		expect(body).toMatch(/<form[^>]*method="get"[^>]*action="\/collections\/test"/);
		expect(body).not.toMatch(/\sonsubmit=/);
	});

	it('creates a separate store for each render', () => {
		const first = render(CollectionFixture, {
			props: { data: { handle: 'a', dataSearch: '' }, urlSearch: '?filter.p.tag=x' }
		});
		const second = render(CollectionFixture, {
			props: { data: { handle: 'b', dataSearch: '' }, urlSearch: '' }
		});
		expect(first.body).toContain('>a</span>');
		expect(second.body).toContain('>b</span>');
		expect(second.body).toContain('<span data-testid="filters">[]</span>');
	});
});
