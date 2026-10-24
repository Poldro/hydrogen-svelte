<script lang="ts">
	import {
		useCollection,
		useCollectionActions,
		useCollectionForm
	} from '../../collection/collection.svelte.js';

	let { hook }: { hook: 'useCollection' | 'useCollectionActions' | 'useCollectionForm' } =
		$props();

	// svelte-ignore state_referenced_locally
	({ useCollection, useCollectionActions, useCollectionForm })[hook]();
</script>
