<script lang="ts" module>
	import type { ShopifyRoutesOptions, ShopifyScriptTagsOptions } from '@shopify/hydrogen';

	export interface ShopifyScriptsProps extends ShopifyScriptTagsOptions {
		/** Navigates after Shopify's scripts resolve a URL to your app's route, e.g. SvelteKit's `goto`. */
		navigate?: ShopifyRoutesOptions['navigate'];
		/** Your app's custom route templates, which Shopify's scripts use to match storefront URLs. */
		routes?: ShopifyRoutesOptions['routes'];
		/** Loads Shopify's WebMCP tools when the browser supports WebMCP. Defaults to `true`. */
		webMcp?: boolean;
	}
</script>

<script lang="ts">
	import { initializeShopifyScripts, renderShopifyScriptTags } from '@shopify/hydrogen';
	import { onMount } from 'svelte';

	let { consent, navigate, routes, webMcp = true, ...scriptOptions }: ShopifyScriptsProps =
		$props();

	// Like the React and Vue bindings, the tags and the browser startup use the initial props only.
	// The markup comes from Hydrogen's own serializer, which escapes attribute values. Scripts
	// inserted with {@html} on the client never run, so this must be server-rendered (see README).
	// svelte-ignore state_referenced_locally
	const html = renderShopifyScriptTags({ ...scriptOptions, consent }).join('');

	onMount(() => {
		void initializeShopifyScripts({ consent, navigate, routes, webMcp });
	});
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</svelte:head>
