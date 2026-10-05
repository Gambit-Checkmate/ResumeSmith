<script lang="ts">
	let dismissed = $state(false);
</script>

{#if !dismissed}
	<div
		role="status"
		class="md:hidden flex items-start gap-3 bg-amber-50 border-b border-amber-300 px-4 py-3 text-sm text-amber-900"
	>
		<p class="flex-1">This site is designed for desktop. Some features may not work well on mobile.</p>
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
