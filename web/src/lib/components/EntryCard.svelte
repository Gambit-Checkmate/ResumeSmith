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

<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
	<div class="flex justify-between items-start">
		<span class="text-sm font-medium text-gray-500">#{index + 1}</span>
		<div class="flex items-center gap-2">
			<MoveControls {index} {count} {label} {onMove} />
			<button class="danger text-sm px-2 py-1" aria-label={`Remove ${label}`} onclick={onRemove}>Remove</button>
		</div>
	</div>
	{@render children()}
</div>
