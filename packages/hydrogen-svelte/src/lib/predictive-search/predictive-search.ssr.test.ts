import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import SearchFixture from '../test-utils/predictive-search/SearchFixture.svelte';

describe('PredictiveSearchProvider (server)', () => {
	it('renders a GET search form that works without JavaScript', () => {
		const { body } = render(SearchFixture, {
			props: { searchAction: '/search' }
		});
		expect(body).toContain('<span data-testid="status">idle</span>');
		expect(body).toMatch(/<form[^>]*action="\/search"[^>]*method="get"[^>]*role="search"/);
		expect(body).toMatch(/<input[^>]*name="q"[^>]*type="search"[^>]*autocomplete="off"/);
		expect(body).not.toMatch(/\son(submit|input)=/);
	});
});
