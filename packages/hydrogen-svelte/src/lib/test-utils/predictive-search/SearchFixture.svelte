<script lang="ts">
	import PredictiveSearchProvider, {
		type PredictiveSearchProviderProps
	} from '../../predictive-search/PredictiveSearchProvider.svelte';
	import SearchView, { type SearchViewProps } from './SearchView.svelte';

	let {
		formOptions,
		inputOptions,
		isEqual,
		expose,
		...providerProps
	}: Omit<PredictiveSearchProviderProps, 'children'> & SearchViewProps = $props();
</script>

<PredictiveSearchProvider {...providerProps}>
	<SearchView {formOptions} {inputOptions} {isEqual} {expose} />
</PredictiveSearchProvider>
