<script lang="ts" module>
	import type { CollectionActions, CollectionState } from '../../collection/collection.svelte.js';
	import type { ReactiveValue } from '../../internal/from-store.js';

	export interface CollectionApi {
		state: ReactiveValue<CollectionState>;
		status: ReactiveValue<CollectionState['status']>;
		actions: CollectionActions;
	}
</script>

<script lang="ts">
	import {
		useCollection,
		useCollectionActions,
		useCollectionForm,
		type CollectionFormPropsOptions
	} from '../../collection/collection.svelte.js';

	let {
		formOptions,
		isEqual,
		expose
	}: {
		formOptions?: CollectionFormPropsOptions;
		isEqual?: (a: string, b: string) => boolean;
		expose?: (api: CollectionApi) => void;
	} = $props();

	const state = useCollection();
	// svelte-ignore state_referenced_locally
	const status = useCollection((s) => s.status, isEqual);
	const actions = useCollectionActions();
	const { formProps } = useCollectionForm();
	// svelte-ignore state_referenced_locally
	expose?.({ state, status, actions });
</script>

<span data-testid="handle">{state.current.handle}</span>
<span data-testid="status">{status.current}</span>
<span data-testid="filters">{JSON.stringify(state.current.filters)}</span>
<span data-testid="sort">{state.current.sortKey ?? ''}:{state.current.reverse}</span>

<form {...formProps(formOptions)} method="get" action="/collections/test" data-testid="filter-form">
	<input type="checkbox" name="filter.p.tag" value="sale" data-testid="tag-sale" />
	<select name="sort_by" data-testid="sort-by">
		<option value="manual">Featured</option>
		<option value="price-ascending">Price, low to high</option>
	</select>
	<button type="submit">Apply</button>
</form>
