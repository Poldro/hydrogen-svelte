import { expect, test } from '@playwright/test';

// Runs in both projects. Without JavaScript, option links reload the page with ?Size=…, and the
// server selects the variant; with it, the product store selects in place and syncs the URL.

test('selects a variant and adds it to the cart', async ({ page }) => {
	await page.goto('/products/test-tshirt');
	const sizes = page.getByRole('group', { name: 'Size' });
	await expect(sizes.getByRole('link', { name: 'S' })).toHaveAttribute('aria-current', 'true');

	await sizes.getByRole('link', { name: 'M' }).click();
	await expect(page).toHaveURL(/[?&]Size=M\b/);
	await expect(sizes.getByRole('link', { name: 'M' })).toHaveAttribute('aria-current', 'true');
	await expect(sizes.getByRole('link', { name: 'S' })).not.toHaveAttribute('aria-current');

	const posted = page.waitForResponse(
		(response) => response.url().endsWith('/api/cart') && response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: 'Add to cart' }).click();
	await posted;
	await expect(page.getByTestId('cart-count')).toHaveText('1');

	await page.goto('/cart');
	await expect(page.getByTestId('cart-line')).toHaveCount(1);
	await expect(page.getByTestId('cart-line')).toContainText('· M');
});

test('server-renders the variant from the URL', async ({ page }) => {
	await page.goto('/products/test-tshirt?Size=L');
	await expect(
		page.getByRole('group', { name: 'Size' }).getByRole('link', { name: 'L' })
	).toHaveAttribute('aria-current', 'true');
});
