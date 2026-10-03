<script lang="ts">
	import { tick } from 'svelte';
	import type { MoveDirection } from '$lib/reorder';

	let {
		index,
		count,
		label,
		onMove,
	}: { index: number; count: number; label: string; onMove: (direction: MoveDirection) => void } = $props();
	let upButton: HTMLButtonElement;
	let downButton: HTMLButtonElement;

	async function move(direction: MoveDirection) {
		onMove(direction);
		await tick();
		// The clicked direction can become disabled at the new boundary.
		(direction === -1 ? downButton : upButton).focus();
	}
</script>

<div class="flex items-center gap-1" role="group" aria-label={`Reorder ${label}`}>
	<button
		bind:this={upButton}
		class="secondary px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
		aria-label={`Move ${label} up`}
		title={`Move ${label} up`}
		disabled={index === 0}
		onclick={() => move(-1)}>↑</button
	>
	<button
		bind:this={downButton}
		class="secondary px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
		aria-label={`Move ${label} down`}
		title={`Move ${label} down`}
		disabled={index === count - 1}
		onclick={() => move(1)}>↓</button
	>
</div>
