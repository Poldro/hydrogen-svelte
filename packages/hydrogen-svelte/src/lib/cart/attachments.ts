import { attachQuantityInput } from '@shopify/hydrogen';
import type { Attachment } from 'svelte/attachments';

/**
 * Submits the input's cart form when the quantity changes.
 *
 * Use it on an input from `register('quantity', { value, interactive: true })`. The form's first
 * submit button must be `register('set')`; the core throws otherwise.
 *
 * @example
 * ```svelte
 * <input {...register('quantity', { value: line.quantity, interactive: true })} {@attach quantityInput} />
 * ```
 */
export const quantityInput: Attachment<HTMLInputElement> = (input) => {
	const form = input.form;
	if (!form) {
		throw new Error('quantityInput must be attached to an input inside a <form>.');
	}
	return attachQuantityInput(input, form);
};
