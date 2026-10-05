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
		const clickedButton = direction === -1 ? upButton : downButton;
		const oppositeButton = direction === -1 ? downButton : upButton;
		// Keep repeated keyboard moves going in the same direction until the boundary.
		(clickedButton.disabled ? oppositeButton : clickedButton).focus();
	}
</script>

<div class="track" role="group" aria-label={`Reorder ${label}`}>
	<button
		bind:this={upButton}
		type="button"
		class="step"
		aria-label={`Move ${label} up`}
		title={`Move ${label} up`}
		disabled={index === 0}
		onclick={() => move(-1)}
	>
		<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 5-5 5 5" />
		</svg>
	</button>
	<button
		bind:this={downButton}
		type="button"
		class="step"
		aria-label={`Move ${label} down`}
		title={`Move ${label} down`}
		disabled={index === count - 1}
		onclick={() => move(1)}
	>
		<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
		</svg>
	</button>
</div>

<style>
	/* The global button rule in app.css is unlayered, so sizes are set here rather than with utilities. */
	.track {
		display: inline-flex;
		flex: none;
		gap: 0.125rem;
		border-radius: 0.375rem;
		background-color: var(--color-gray-100, #f3f4f6);
		padding: 0.125rem;
	}

	.step {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		border-radius: 0.25rem;
		color: var(--color-gray-600, #4b5563);
		background-color: transparent;
	}

	.step:hover:not(:disabled) {
		background-color: var(--color-gray-200, #e5e7eb);
		color: var(--color-gray-900, #111827);
	}

	.step:focus-visible {
		outline: 2px solid var(--color-blue-500, #3b82f6);
		outline-offset: 1px;
	}

	.step:disabled {
		cursor: not-allowed;
		opacity: 0.35;
	}

	@media (prefers-reduced-motion: reduce) {
		.step {
			transition: none;
		}
	}
</style>
