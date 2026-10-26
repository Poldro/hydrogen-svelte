<script lang="ts">
	import { PredictiveSearchProvider } from 'hydrogen-svelte';

	import { useOptionalCart } from '$lib/cart';
	import SearchBox from './SearchBox.svelte';

	// Optional: the header also renders on error pages, where the provider may be missing.
	const count = useOptionalCart((s) => s.data.totalQuantity);
	const pending = useOptionalCart((s) => s.pending.lines.size > 0);
</script>

<header>
	<a href="/" class="brand">hydrogen-svelte</a>
	<PredictiveSearchProvider limit={5} types={['PRODUCT']}>
		<SearchBox />
	</PredictiveSearchProvider>
	<nav>
		<a href="/collections/test-catalog">Catalog</a>
		<a href="/cart" data-testid="cart-link">
			Cart
			{#if count.current !== undefined}
				<span class="badge" data-testid="cart-count" aria-label="{count.current} items in cart"
					>{count.current}</span
				>
			{/if}
			{#if pending.current}<span class="pending" aria-hidden="true">…</span>{/if}
		</a>
	</nav>
</header>

<style>
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid #ddd;
	}
	.brand {
		font-weight: 700;
	}
	.badge {
		display: inline-block;
		min-width: 1.5em;
		padding: 0 0.4em;
		border-radius: 1em;
		background: #111;
		color: #fff;
		text-align: center;
	}
</style>
