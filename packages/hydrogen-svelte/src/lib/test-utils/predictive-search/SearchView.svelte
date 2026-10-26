<script lang="ts" module>
	import type { PredictiveSearchState } from '@shopify/hydrogen';

	import type {
		PredictiveSearchActions,
		PredictiveSearchFormPropsOptions,
		PredictiveSearchFormResult,
		PredictiveSearchQueryInputPropsOptions
	} from '../../predictive-search/predictive-search.svelte.js';
	import type { ReactiveValue } from '../../internal/from-store.js';

	export interface SearchApi {
		state: ReactiveValue<PredictiveSearchState>;
		term: ReactiveValue<string>;
		actions: PredictiveSearchActions;
		form: PredictiveSearchFormResult;
	}

	export interface SearchViewProps {
		formOptions?: PredictiveSearchFormPropsOptions;
		inputOptions?: PredictiveSearchQueryInputPropsOptions;
		isEqual?: (a: string, b: string) => boolean;
		expose?: (api: SearchApi) => void;
	}
</script>

<script lang="ts">
	import {
		usePredictiveSearch,
		usePredictiveSearchActions,
		usePredictiveSearchForm
	} from '../../predictive-search/predictive-search.svelte.js';

	let { formOptions, inputOptions, isEqual, expose }: SearchViewProps = $props();

	const state = usePredictiveSearch();
	// svelte-ignore state_referenced_locally
	const term = usePredictiveSearch((s) => s.term, isEqual);
	const actions = usePredictiveSearchActions();
	const form = usePredictiveSearchForm();
	// svelte-ignore state_referenced_locally
	expose?.({ state, term, actions, form });
</script>

<span data-testid="status">{state.current.status}</span>
<span data-testid="term">{term.current}</span>
<form data-testid="search-form" {...form.formProps(formOptions)}>
	<input data-testid="query" aria-label="Search" {...form.register('query', inputOptions)} />
</form>
