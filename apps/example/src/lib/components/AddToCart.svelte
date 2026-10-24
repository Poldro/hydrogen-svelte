<script lang="ts">
	import { useCartForm } from '$lib/cart';

	let { merchandiseId, disabled = false }: { merchandiseId: string; disabled?: boolean } =
		$props();

	const { formProps, register } = useCartForm();
</script>

<!-- Posts to /api/cart; works without JavaScript and goes through the cart store once hydrated. -->
<form {...formProps()}>
	<input {...register('merchandiseId', { value: merchandiseId })} type="hidden" />
	<button {...register('add')} {disabled}>{disabled ? 'Sold out' : 'Add to cart'}</button>
</form>
