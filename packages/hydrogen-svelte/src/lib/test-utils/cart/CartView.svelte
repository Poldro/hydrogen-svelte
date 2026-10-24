<script lang="ts">
	import { quantityInput } from '../../cart/attachments.js';
	import { useCart, useCartForm } from '../../cart/cart.js';

	let { onRender }: { onRender?: (count: number) => void } = $props();

	const count = useCart((s) => s.data.totalQuantity);
	const lines = useCart((s) => s.data.lines.nodes);
	const { formProps, register, isPending } = useCartForm();

	$effect(() => {
		onRender?.(count.current);
	});
</script>

<span data-testid="count">{count.current}</span>
{#if isPending.initial}<p>Loading cart</p>{/if}
{#if isPending.lines()}<p>Cart updating</p>{/if}

<ul>
	{#each lines.current as line (line.id)}
		<li>
			<span data-testid="title">{line.merchandise?.product.title}</span>
			<form {...formProps()} data-testid="line-form">
				<input {...register('lineId', { value: line.id })} type="hidden" />
				<button {...register('set')}></button>
				<input
					{...register('quantity', { value: line.quantity, interactive: true })}
					{@attach quantityInput}
					aria-label="Quantity"
				/>
				<button {...register('increase')}>+</button>
				<button {...register('decrease')}>-</button>
				<button {...register('remove')}>Remove</button>
				{#if isPending.lines(line.id)}<span>Updating {line.id}</span>{/if}
			</form>
		</li>
	{/each}
</ul>
