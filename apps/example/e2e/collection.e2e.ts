import { expect, test, type Page } from '@playwright/test';

// Runs in both projects. Without JavaScript the filter form is a plain GET form and needs the
// Apply button; with it, the collection store applies each change and navigates in place.

const COLLECTION = '/collections/test-catalog';

async function apply(page: Page) {
	if (test.info().project.name === 'no-js') {
		await page.getByRole('button', { name: 'Apply' }).click();
	}
}

const products = (page: Page) => page.getByTestId('collection-product');

test('sorts by price', async ({ page }) => {
	await page.goto(COLLECTION);
	await page.getByTestId('sort-by').selectOption({ label: 'Price, high to low' });
	await apply(page);

	await expect(page).toHaveURL(/[?&]sort_by=price-descending\b/);
	await expect(products(page).first()).toContainText('Test T-shirt');
	await expect(page.getByTestId('sort-by')).toHaveValue('price-descending');
	await expect(page.getByTestId('collection-status')).toHaveText('');
});

test('filters by price and removes the filter from its chip', async ({ page }) => {
	await page.goto(COLLECTION);
	await page.getByLabel('Max').fill('10');
	await page.getByLabel('Max').press('Enter');

	await expect(page).toHaveURL(/[?&]filter\.v\.price\.lte=10\b/);
	await expect(products(page)).toHaveCount(1);
	await expect(products(page)).toContainText('Test Tea');

	await page.getByRole('list', { name: 'Active filters' }).getByRole('link', { name: /Price/ }).click();
	await expect(page).not.toHaveURL(/filter\./);
	await expect(products(page)).toHaveCount(2);
	await expect(page.getByLabel('Max')).toHaveValue('');
});

test('filters by availability', async ({ page }) => {
	await page.goto(COLLECTION);
	await page.getByLabel(/In stock/).check();
	await apply(page);

	await expect(page).toHaveURL(/[?&]filter\.v\.availability=1\b/);
	await expect(page.getByLabel(/In stock/)).toBeChecked();
	await expect(page.getByRole('list', { name: 'Active filters' })).toContainText('In stock');
});

test('paginates, and a sort change starts again from the first page', async ({ page }) => {
	await page.goto(COLLECTION);
	await expect(products(page)).toHaveCount(2);

	await page.getByTestId('next-page').click();
	await expect(page).toHaveURL(/[?&]after=/);
	await expect(products(page)).toHaveCount(1);
	await expect(page.getByTestId('next-page')).toHaveCount(0);

	await page.getByTestId('previous-page').click();
	await expect(page).toHaveURL(/[?&]before=/);
	await expect(products(page)).toHaveCount(2);

	await page.getByTestId('next-page').click();
	await expect(products(page)).toHaveCount(1);
	await page.getByTestId('sort-by').selectOption({ label: 'Alphabetically, A-Z' });
	await apply(page);
	await expect(page).toHaveURL(/[?&]sort_by=title-ascending\b/);
	await expect(page).not.toHaveURL(/[?&](after|before)=/);
	await expect(products(page)).toHaveCount(2);
	await expect(products(page).first()).toContainText('Test Mug');
});

test('filters in place with JavaScript, without a full page load', async ({ page }) => {
	test.skip(test.info().project.name === 'no-js', 'needs JavaScript');
	await page.goto(COLLECTION);
	await page.waitForLoadState('networkidle');
	await page.evaluate(() => Object.assign(window, { __samePage: true }));

	await page.getByLabel(/In stock/).check();
	await expect(page).toHaveURL(/[?&]filter\.v\.availability=1\b/);
	await page.getByLabel(/In stock/).uncheck();
	await expect(page).not.toHaveURL(/filter\./);
	expect(await page.evaluate(() => '__samePage' in window)).toBe(true);
});
