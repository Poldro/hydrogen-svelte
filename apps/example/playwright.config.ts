import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		// adapter-node defaults to https for its origin; without ORIGIN, SvelteKit's CSRF check
		// rejects the no-JS form posts to /api/cart.
		command: 'pnpm build && ORIGIN=http://localhost:3000 node --env-file-if-exists=.env build',
		port: 3000,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	},
	use: { baseURL: 'http://localhost:3000' },
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	// Every test gets a fresh context, so a fresh cart cookie.
	fullyParallel: true,
	projects: [
		{ name: 'js', use: { javaScriptEnabled: true } },
		{ name: 'no-js', use: { javaScriptEnabled: false } }
	]
});
