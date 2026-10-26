<script lang="ts">
	import {
		usePredictiveSearch,
		usePredictiveSearchActions,
		usePredictiveSearchForm
	} from '../../predictive-search/predictive-search.svelte.js';

	let {
		hook
	}: { hook: 'usePredictiveSearch' | 'usePredictiveSearchActions' | 'usePredictiveSearchForm' } =
		$props();

	// svelte-ignore state_referenced_locally
	({ usePredictiveSearch, usePredictiveSearchActions, usePredictiveSearchForm })[hook]();
</script>
