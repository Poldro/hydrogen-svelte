<script lang="ts">
	// Calls `run` during component initialisation, where context and lifecycle functions work.
	let { run }: { run: () => void } = $props();

	// svelte-ignore state_referenced_locally
	run();
</script>
