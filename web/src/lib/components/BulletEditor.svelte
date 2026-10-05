<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { toSingleLine } from '$lib/resume-utils';

	let {
		bullets = $bindable(),
		label,
		path = '',
		placeholder = '',
	}: { bullets: string[]; label: string; path?: string; placeholder?: string } = $props();
	const fieldId = $props.id();

	function addBullet() {
		bullets = [...bullets, ''];
	}
	function removeBullet(index: number) {
		bullets = bullets.filter((_, i) => i !== index);
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
	<div class="flex items-center justify-between mb-2">
		<span class="text-sm font-medium text-gray-700">{label}</span>
		<button class="secondary text-xs px-2 py-1" onclick={addBullet}>+ Add bullet</button>
	</div>
	{#each bullets as _, bi}
		<div class="flex gap-2 mb-2">
			<textarea
				id={`${fieldId}-${bi}`}
				aria-label={`${label} bullet ${bi + 1}`}
				rows="1"
				bind:value={bullets[bi]}
				{placeholder}
				class="flex-1 resize-none overflow-hidden"
				class:ai-filled={aiFilled.has(`${path}.${bi}`)}
				{@attach autosize(bullets[bi])}
				onkeydown={(e) => e.key === 'Enter' && !e.isComposing && e.preventDefault()}
				oninput={(e) => handleInput(e, bi)}
			></textarea>
			{#if bullets.length > 1}<button
					class="danger self-start text-xs px-2"
					onclick={() => removeBullet(bi)}
					aria-label="Remove bullet"
					title="Remove bullet">Remove</button
				>{/if}
		</div>
	{/each}
</div>
