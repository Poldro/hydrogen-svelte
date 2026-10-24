import { expect, test, type Locator, type Page } from '@playwright/test';

// Runs in both projects: with JavaScript the cart store handles the form, without it the
// browser posts to /api/cart and follows the redirect back. The outcome must be the same.

const cartCount = (page: Page) => page.getByTestId('cart-count');

/**
 * Clicks a cart form button and waits for the POST to /api/cart to complete. With JavaScript the
 * count updates optimistically before the server responds, so navigating right after the click
 * would abort the request.
 */
async function submitCart(page: Page, button: Locator) {
	const posted = page.waitForResponse(
		(response) => response.url().endsWith('/api/cart') && response.request().method() === 'POST'
	);
	await button.click();
	await posted;
}

async function addFirstProduct(page: Page) {
	await page.goto('/');
	const product = page.getByTestId('product').first();
	await expect(product).toBeVisible();
	await submitCart(page, product.getByRole('button', { name: 'Add to cart' }));
}

test('adds a product to the cart and server-renders it', async ({ page }) => {
	await page.goto('/');
	await expect(cartCount(page)).toHaveText('0');

	await addFirstProduct(page);
	await expect(cartCount(page)).toHaveText('1');

	// A full reload proves the cart comes from the server render, not from client state.
	await page.reload();
	await expect(cartCount(page)).toHaveText('1');

	await page.goto('/cart');
	await expect(page.getByTestId('cart-line')).toHaveCount(1);
});

test('changes quantity and removes a line from the cart page', async ({ page }) => {
	await addFirstProduct(page);
	await expect(cartCount(page)).toHaveText('1');

	await page.goto('/cart');
	await submitCart(page, page.getByRole('button', { name: 'Increase quantity' }));
	await expect(cartCount(page)).toHaveText('2');
	await expect(page.getByRole('textbox', { name: 'Quantity' })).toHaveValue('2');

	await submitCart(page, page.getByRole('button', { name: 'Remove' }));
	await expect(page.getByTestId('cart-empty')).toBeVisible();
	await expect(cartCount(page)).toHaveText('0');
});

test('keeps carts isolated between customers', async ({ browser }) => {
	const alice = await browser.newContext();
	const bob = await browser.newContext();
	const alicePage = await alice.newPage();
	const bobPage = await bob.newPage();

	await addFirstProduct(alicePage);
	await expect(cartCount(alicePage)).toHaveText('1');

	await bobPage.goto('/');
	await expect(cartCount(bobPage)).toHaveText('0');

	await alice.close();
	await bob.close();
});

test('marks pages that render a cart as private', async ({ page }) => {
	await addFirstProduct(page);
	await expect(cartCount(page)).toHaveText('1');

	const response = await page.goto('/');
	expect(response?.headers()['cache-control']).toContain('private');
});
