<script lang="ts">
	import { useCartForm, type CartFormPropsOptions } from '../../cart/cart.js';

	let { options }: { options?: CartFormPropsOptions } = $props();

	const { formProps, register } = useCartForm();
</script>

<form {...formProps(options)} data-testid="add-form">
	<input {...register('merchandiseId', { value: 'gid://shopify/ProductVariant/1' })} type="hidden" />
	<button {...register('add')}>Add to cart</button>
</form>
