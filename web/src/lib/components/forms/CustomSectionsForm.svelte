<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { customSectionKey } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { moveWithHighlights } from '$lib/reorder';
	import BulletEditor from '../BulletEditor.svelte';
	import MoveControls from '../MoveControls.svelte';

	let { data }: { data: ResumeData } = $props();

	function addSection() {
		const id = generateId();
		data.customSections = [
			...data.customSections,
			{ id, heading: '', entries: [{ id: generateId(), title: '', date: '', bullets: [''] }] },
		];
		data.sectionOrder = [...data.sectionOrder, customSectionKey(id)];
	}
	function removeSection(id: string) {
		data.customSections = data.customSections.filter((section) => section.id !== id);
		data.sectionOrder = data.sectionOrder.filter((key) => key !== customSectionKey(id));
	}
	function addEntry(sectionIndex: number) {
		const section = data.customSections[sectionIndex];
		section.entries = [...section.entries, { id: generateId(), title: '', date: '', bullets: [''] }];
	}
	function removeEntry(sectionIndex: number, entryId: string) {
		const section = data.customSections[sectionIndex];
		section.entries = section.entries.filter((entry) => entry.id !== entryId);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Custom Sections</h2>
		<button class="primary text-sm" onclick={addSection}>+ Add section</button>
	</div>
	<p class="text-sm text-gray-600">
		Name a section yourself, such as Grants, Teaching, Talks, or Service, and fill it with entries. Reorder sections in
		the Layout tab.
	</p>
	{#each data.customSections as section, si (section.id)}
		<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
			<div class="flex justify-between items-end gap-2">
				<div class="flex-1">
					<label for="custom-{section.id}-heading">Section heading</label>
					<input
						id="custom-{section.id}-heading"
						type="text"
						bind:value={section.heading}
						placeholder="Grants and Funding"
						class:ai-filled={aiFilled.has(`customSections.${si}.heading`)}
						oninput={() => clearHighlight(`customSections.${si}.heading`)}
					/>
				</div>
				<button class="danger text-sm px-2 py-1" onclick={() => removeSection(section.id)}>Remove section</button>
			</div>
			{#each section.entries as entry, ei (entry.id)}
				{@const path = `customSections.${si}.entries.${ei}`}
				<div class="border rounded-md bg-white p-3 space-y-3">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div class="md:col-span-2">
							<label for="custom-{entry.id}-title">Title</label>
							<input
								id="custom-{entry.id}-title"
								type="text"
								bind:value={entry.title}
								placeholder="Example Foundation Research Grant ($50,000)"
								class:ai-filled={aiFilled.has(`${path}.title`)}
								oninput={() => clearHighlight(`${path}.title`)}
							/>
						</div>
						<div>
							<label for="custom-{entry.id}-date">Date (optional)</label>
							<input
								id="custom-{entry.id}-date"
								type="text"
								bind:value={entry.date}
								placeholder="2021 - 2024"
								class:ai-filled={aiFilled.has(`${path}.date`)}
								oninput={() => clearHighlight(`${path}.date`)}
							/>
						</div>
					</div>
					<BulletEditor bind:bullets={entry.bullets} label="Details" path={`${path}.bullets`} />
					<div class="flex justify-end">
						<div class="flex items-center gap-2">
							<MoveControls
								index={ei}
								count={section.entries.length}
								label={`entry ${ei + 1} in ${section.heading || 'custom section'}`}
								onMove={(direction) =>
									(section.entries = moveWithHighlights(
										section.entries,
										`customSections.${si}.entries`,
										ei,
										direction,
									))}
							/>
							<button class="danger text-xs px-2 py-1" onclick={() => removeEntry(si, entry.id)}>Remove entry</button>
						</div>
					</div>
				</div>
			{/each}
			<button class="secondary text-sm" onclick={() => addEntry(si)}>+ Add entry</button>
		</div>
	{/each}
	{#if data.customSections.length === 0}<p class="text-gray-500 text-center py-8">No custom sections added yet.</p>{/if}
</div>
