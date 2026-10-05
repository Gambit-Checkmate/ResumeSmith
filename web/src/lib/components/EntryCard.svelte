<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MoveDirection } from '$lib/reorder';
	import MoveControls from './MoveControls.svelte';

	let {
		index,
		count,
		label,
		onMove,
		onRemove,
		children,
	}: {
		index: number;
		count: number;
		label: string;
		onMove: (direction: MoveDirection) => void;
		onRemove: () => void;
		children: Snippet;
	} = $props();
</script>

<div class="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<span class="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-500 ring-1 ring-gray-200"
			>#{index + 1}</span
		>
		<div class="flex items-center gap-2">
			<MoveControls {index} {count} {label} {onMove} />
			<button type="button" class="remove text-sm" aria-label={`Remove ${label}`} onclick={onRemove}>Remove</button>
		</div>
	</div>
	{@render children()}
</div>

<style>
	/* The global button rule in app.css is unlayered, so sizes are set here rather than with utilities. */
	.remove {
		padding: 0.3125rem 0.625rem;
		color: var(--color-gray-600, #4b5563);
		background-color: transparent;
	}

	.remove:hover {
		background-color: var(--color-red-50, #fef2f2);
		color: var(--color-red-700, #b91c1c);
	}

	.remove:focus-visible {
		outline: 2px solid var(--color-red-500, #ef4444);
		outline-offset: 1px;
	}
</style>
