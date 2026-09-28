<script lang="ts">
	let dismissed = $state(false);
</script>

{#if !dismissed}
	<div
		role="status"
		class="md:hidden flex items-start gap-3 bg-amber-50 border-b border-amber-300 px-4 py-3 text-sm text-amber-900"
	>
		<p class="flex-1">
			This site is not directly designed for mobile. You may experience issues or a degraded experience.
		</p>
		<button
			type="button"
			class="px-2 py-0.5 text-amber-900 hover:bg-amber-100"
			aria-label="Dismiss mobile warning"
			onclick={() => (dismissed = true)}
		>
			✕
		</button>
	</div>
{/if}
