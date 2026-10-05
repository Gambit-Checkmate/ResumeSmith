<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { presentationKinds, presentationKindLabels } from '$lib/presentation';
	import { moveWithHighlights } from '$lib/reorder';
	import EntryCard from '../EntryCard.svelte';

	let { data }: { data: ResumeData } = $props();

	function addPresentation() {
		data.presentations = [
			...data.presentations,
			{ id: generateId(), title: '', event: '', location: '', date: '', kind: 'contributed', url: '' },
		];
	}
	function removePresentation(id: string) {
		data.presentations = data.presentations.filter((p) => p.id !== id);
	}
</script>

<div class="editor-form">
	<div class="editor-heading">
		<h2>Presentations</h2>
		<button class="primary editor-add" onclick={addPresentation}>+ Add presentation</button>
	</div>
	{#each data.presentations as presentation, i (presentation.id)}
		{@const id = `presentation-${presentation.id}`}
		{@const path = `presentations.${i}`}
		<EntryCard
			index={i}
			count={data.presentations.length}
			label={`presentation ${i + 1}`}
			onMove={(direction) =>
				(data.presentations = moveWithHighlights(data.presentations, 'presentations', i, direction))}
			onRemove={() => removePresentation(presentation.id)}
		>
			<div class="editor-grid">
				<div class="editor-span">
					<label for="{id}-title">Title</label><input
						id="{id}-title"
						type="text"
						bind:value={presentation.title}
						placeholder="Representative Findings on Example Systems"
						class:ai-filled={aiFilled.has(`${path}.title`)}
						oninput={() => clearHighlight(`${path}.title`)}
					/>
				</div>
				<div>
					<label for="{id}-event">Event</label><input
						id="{id}-event"
						type="text"
						bind:value={presentation.event}
						placeholder="Annual Meeting of the Example Society"
						class:ai-filled={aiFilled.has(`${path}.event`)}
						oninput={() => clearHighlight(`${path}.event`)}
					/>
				</div>
				<div>
					<label for="{id}-location">Location</label><input
						id="{id}-location"
						type="text"
						bind:value={presentation.location}
						placeholder="Example City"
						class:ai-filled={aiFilled.has(`${path}.location`)}
						oninput={() => clearHighlight(`${path}.location`)}
					/>
				</div>
				<div>
					<label for="{id}-date">Date</label><input
						id="{id}-date"
						type="month"
						bind:value={presentation.date}
						class:ai-filled={aiFilled.has(`${path}.date`)}
						oninput={() => clearHighlight(`${path}.date`)}
					/>
				</div>
				<div>
					<label for="{id}-kind">Type</label>
					<select id="{id}-kind" bind:value={presentation.kind}>
						{#each presentationKinds as kind}
							<option value={kind}>{presentationKindLabels[kind]}</option>
						{/each}
					</select>
				</div>
				<div class="editor-span">
					<label for="{id}-url">Link</label><input
						id="{id}-url"
						type="text"
						bind:value={presentation.url}
						placeholder="example.com/slides"
						class:ai-filled={aiFilled.has(`${path}.url`)}
						oninput={() => clearHighlight(`${path}.url`)}
					/>
				</div>
			</div>
		</EntryCard>
	{/each}
	{#if data.presentations.length === 0}<p class="editor-empty">No presentations added yet.</p>{/if}
</div>
