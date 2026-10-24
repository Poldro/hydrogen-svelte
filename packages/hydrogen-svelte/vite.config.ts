import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.{ts,svelte}'],
			exclude: ['src/lib/**/*.test.ts', 'src/lib/**/test-utils/**']
		},
		projects: [
			{
				// Browser project: runes, effects, DOM events, attachments.
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.test.ts']
				}
			},
			{
				// Node project: server rendering through svelte/server and plain unit tests.
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',					include: ['src/**/*.test.ts'],
					exclude: ['src/**/*.svelte.test.ts']
				}
			}
		]
	}
});
