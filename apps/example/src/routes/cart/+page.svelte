<script lang="ts">
	import { quantityInput } from 'hydrogen-svelte';

	import { useCart, useCartForm } from '$lib/cart';
	import { formatMoney } from '$lib/money';

	const lines = useCart((s) => s.data.lines.nodes);
	const subtotal = useCart((s) => s.data.cost.subtotalAmount);
	const checkoutUrl = useCart((s) => s.data.checkoutUrl);
	const costPending = useCart((s) => Boolean(s.pending.cost));
	const errors = useCart((s) => s.errors);
	const { formProps, register, isPending } = useCartForm();
</script>

<svelte:head>
	<title>Cart · hydrogen-svelte</title>
</svelte:head>

<h1>Cart</h1>

{#if errors.current.network.length > 0}
	<p role="alert">{errors.current.network.at(-1)?.message}</p>
{/if}

{#if isPending.initial}
	<p>Loading cart…</p>
{:else if lines.current.length === 0}
	<p data-testid="cart-empty">Your cart is empty. <a href="/">Browse products</a>.</p>
{:else}
	<ul class="lines">
		{#each lines.current as line (line.id)}
			{@const lineErrors = errors.current.lines.get(line.id)?.userErrors ?? []}
			<li data-testid="cart-line" aria-busy={isPending.lines(line.id)}>
				<div>
					<strong>{line.merchandise?.product.title}</strong>
					{#if line.merchandise?.title && line.merchandise.title !== 'Default Title'}
						<span>· {line.merchandise.title}</span>
					{/if}
					<div>{formatMoney(line.cost.totalAmount)}</div>
				</div>

				<form {...formProps()} class="line-form">
					<input {...register('lineId', { value: line.id })} type="hidden" />
					<!-- The set button must come first: it is what the quantity input submits. -->
					<button {...register('set')}></button>
					<button {...register('decrease')} aria-label="Decrease quantity">−</button>
					<input
						{...register('quantity', { value: line.quantity, interactive: true })}
						{@attach quantityInput}
						aria-label="Quantity"
						size="3"
					/>
					<button {...register('increase')} aria-label="Increase quantity">+</button>
					<button {...register('remove')}>Remove</button>
				</form>

				{#each lineErrors as lineError (lineError.message)}
					<p role="alert">{lineError.message}</p>
				{/each}
			</li>
		{/each}
	</ul>

	<p class="subtotal" class:pending={costPending.current}>
		Subtotal: <strong data-testid="cart-subtotal">{formatMoney(subtotal.current)}</strong>
	</p>
	{#if checkoutUrl.current}
		<a class="checkout" href={checkoutUrl.current}>Checkout</a>
	{/if}
{/if}

<style>
	.lines {
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid #eee;
	}
	li[aria-busy='true'] {
		opacity: 0.6;
	}
	.line-form {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}
	.pending {
		opacity: 0.5;
	}
</style>
