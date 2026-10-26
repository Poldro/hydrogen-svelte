import { expect, test } from '@playwright/test';

// Runs in both projects. Without JavaScript the header search is a plain GET form to /search;
// with it, the predictive search store shows results as the customer types.

test('submits the header search to the results page', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('search-input').fill('mug');
	await page.getByTestId('search-input').press('Enter');

	await expect(page).toHaveURL(/\/search\?q=mug$/);
	await expect(page.getByTestId('search-page-result')).toHaveCount(1);
	await expect(page.getByTestId('search-page-result')).toContainText('Test Mug');
	await page.getByRole('link', { name: 'Test Mug' }).click();
	await expect(page).toHaveURL(/\/products\/test-mug/);
});

test('shows an empty state on the results page', async ({ page }) => {
	await page.goto('/search?q=zzzzqqq');
	await expect(page.getByTestId('search-page-empty')).toBeVisible();
});

test.describe('with JavaScript', () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled, 'predictive results need JavaScript');

	test('shows results as the customer types and opens one with the keyboard', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const input = page.getByRole('combobox', { name: 'Search products' });
		await input.pressSequentially('tea');

		const results = page.getByTestId('search-result');
		await expect(results.first()).toContainText('Test Tea');
		await expect(input).toHaveAttribute('aria-expanded', 'true');

		await input.press('ArrowDown');
		await expect(results.first()).toHaveAttribute('aria-selected', 'true');
		await input.press('Enter');
		await expect(page).toHaveURL(/\/products\/test-tea/);
		await expect(page.getByTestId('search-results')).toHaveCount(0);
	});

	test('shows an empty state and closes on Escape', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const input = page.getByRole('combobox', { name: 'Search products' });
		await input.pressSequentially('zzzzqqq');
		await expect(page.getByTestId('search-modal-empty')).toBeVisible();

		await input.press('Escape');
		await expect(page.getByTestId('search-results')).toHaveCount(0);
		await expect(input).toHaveValue('');
	});
});
