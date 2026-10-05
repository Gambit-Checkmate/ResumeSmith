<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { presentationKinds, presentationKindLabels } from '$lib/presentation';
	import { moveWithHighlights } from '$lib/reorder';
	import MoveControls from '../MoveControls.svelte';

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

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Presentations</h2>
		<button class="primary text-sm" onclick={addPresentation}>+ Add presentation</button>
	</div>
	{#each data.presentations as presentation, i (presentation.id)}
		{@const id = `presentation-${presentation.id}`}
		{@const path = `presentations.${i}`}
		<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
			<div class="flex justify-between items-start gap-2">
				<div class="flex-1">
					<label for="{id}-title">Title</label><input
						id="{id}-title"
						type="text"
						bind:value={presentation.title}
						placeholder="Representative Findings on Example Systems"
						class:ai-filled={aiFilled.has(`${path}.title`)}
						oninput={() => clearHighlight(`${path}.title`)}
					/>
				</div>
				<div class="mt-6 flex items-center gap-2">
					<MoveControls
						index={i}
						count={data.presentations.length}
						label={`presentation ${i + 1}`}
						onMove={(direction) =>
							(data.presentations = moveWithHighlights(data.presentations, 'presentations', i, direction))}
					/>
					<button class="danger text-sm px-2 py-1" onclick={() => removePresentation(presentation.id)}>Remove</button>
				</div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
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
				<div class="md:col-span-2">
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
		</div>
	{/each}
	{#if data.presentations.length === 0}<p class="text-gray-500 text-center py-8">No presentations added yet.</p>{/if}
</div>
