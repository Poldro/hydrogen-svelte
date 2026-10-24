<script lang="ts">
	import { goto } from '$app/navigation';
	import { ShopifyScripts } from 'hydrogen-svelte';

	import favicon from '$lib/assets/favicon.svg';
	import { CartProvider } from '$lib/cart';
	import Header from '$lib/components/Header.svelte';
	import { routeTemplates } from '$lib/route-templates';
	import { getShop, i18n } from '$lib/shop';

	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Loads Standard Actions, which the cart store sends its changes through. -->
<ShopifyScripts
	shop={getShop()}
	i18n={{ ...i18n, currency: 'EUR' }}
	analytics={{ channel: 'headless' }}
	navigate={(url) => goto(url)}
	routes={routeTemplates}
/>

<CartProvider initialData={data.cart}>
	<Header />
	<main>
		{@render children()}
	</main>
</CartProvider>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
	}
	main {
		max-width: 60rem;
		margin: 0 auto;
		padding: 1rem;
	}
</style>
