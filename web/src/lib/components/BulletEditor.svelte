<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { toSingleLine } from '$lib/resume-utils';
	import { moveAt, moveWithHighlights, type MoveDirection } from '$lib/reorder';
	import MoveControls from './MoveControls.svelte';

	let {
		bullets = $bindable(),
		label,
		path = '',
		placeholder = '',
	}: { bullets: string[]; label: string; path?: string; placeholder?: string } = $props();
	const fieldId = $props.id();
	let nextKey = 0;
	let bulletKeys = $state(bullets.map(() => nextKey++));
	$effect(() => {
		if (bulletKeys.length !== bullets.length) bulletKeys = bullets.map((_, index) => bulletKeys[index] ?? nextKey++);
	});

	function addBullet() {
		bulletKeys = [...bulletKeys, nextKey++];
		bullets = [...bullets, ''];
	}
	function removeBullet(index: number) {
		bulletKeys = bulletKeys.filter((_, i) => i !== index);
		bullets = bullets.filter((_, i) => i !== index);
	}
	function moveBullet(index: number, direction: MoveDirection) {
		if (index + direction < 0 || index + direction >= bullets.length) return;
		bulletKeys = moveAt(bulletKeys, index, direction);
		bullets = moveWithHighlights(bullets, path, index, direction);
	}

	// Re-runs whenever the bullet text changes, including programmatic updates.
	function autosize(value: string): Attachment<HTMLTextAreaElement> {
		return (el) => {
			void value;
			const fit = () => {
				el.style.height = 'auto';
				el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
			};
			fit();
			window.addEventListener('resize', fit);
			return () => window.removeEventListener('resize', fit);
		};
	}

	// Bullets are single paragraphs, so keep newlines out as the old text input did.
	function handleInput(event: Event & { currentTarget: HTMLTextAreaElement }, bi: number) {
		const el = event.currentTarget;
		if (/[\r\n]/.test(el.value)) bullets[bi] = toSingleLine(el.value);
		clearHighlight(`${path}.${bi}`);
	}
</script>

<div>
	<div class="mb-2 flex items-center justify-between gap-2">
		<span class="text-sm font-medium text-gray-700">{label}</span>
		<button type="button" class="add text-xs" onclick={addBullet}>+ Add bullet</button>
	</div>
	{#each bullets as _, bi (bulletKeys[bi] ?? `pending-${bi}`)}
		<div class="mb-2 flex flex-wrap items-start gap-x-2 gap-y-1">
			<span class="number" aria-hidden="true">{bi + 1}</span>
			<textarea
				id={`${fieldId}-${bi}`}
				aria-label={`${label} bullet ${bi + 1}`}
				rows="1"
				bind:value={bullets[bi]}
				{placeholder}
				class="bullet-input resize-none overflow-hidden"
				class:ai-filled={aiFilled.has(`${path}.${bi}`)}
				{@attach autosize(bullets[bi])}
				onkeydown={(e) => e.key === 'Enter' && !e.isComposing && e.preventDefault()}
				oninput={(e) => handleInput(e, bi)}
			></textarea>
			<div class="actions">
				<MoveControls
					index={bi}
					count={bullets.length}
					label={`${label} bullet ${bi + 1}`}
					onMove={(direction) => moveBullet(bi, direction)}
				/>
				{#if bullets.length > 1}<button
						type="button"
						class="remove"
						onclick={() => removeBullet(bi)}
						aria-label="Remove bullet"
						title="Remove bullet"
					>
						<svg
							class="h-4 w-4"
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="m6 6 8 8M14 6l-8 8" />
						</svg>
					</button>{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	/* The global button rule in app.css is unlayered, so sizes are set here rather than with utilities. */
	.number {
		flex: none;
		width: 1.25rem;
		padding-top: 0.5rem;
		text-align: right;
		font-size: 0.75rem;
		line-height: 1.25rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-gray-400, #9ca3af);
	}

	/* Basis keeps the actions beside the text when there is room and wraps them below it when there is not. */
	.bullet-input {
		flex: 1 1 12rem;
		min-width: 0;
	}

	.actions {
		display: flex;
		flex: none;
		align-items: center;
		gap: 0.25rem;
		margin-left: auto;
	}

	.add {
		padding: 0.25rem 0.5rem;
		color: var(--color-gray-600, #4b5563);
		background-color: transparent;
	}

	.add:hover {
		background-color: var(--color-gray-100, #f3f4f6);
		color: var(--color-gray-900, #111827);
	}

	.add:focus-visible,
	.remove:focus-visible {
		outline: 2px solid var(--color-blue-500, #3b82f6);
		outline-offset: 1px;
	}

	.remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		color: var(--color-gray-500, #6b7280);
		background-color: transparent;
	}

	.remove:hover {
		background-color: var(--color-red-50, #fef2f2);
		color: var(--color-red-700, #b91c1c);
	}

	.remove:focus-visible {
		outline-color: var(--color-red-500, #ef4444);
	}
</style>
