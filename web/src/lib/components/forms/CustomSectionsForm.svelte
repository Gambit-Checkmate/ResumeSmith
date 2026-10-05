<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { customSectionKey } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { moveWithHighlights } from '$lib/reorder';
	import BulletEditor from '../BulletEditor.svelte';
	import EntryCard from '../EntryCard.svelte';

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

<div class="editor-form">
	<div class="editor-heading">
		<h2>Custom Sections</h2>
		<button class="primary editor-add" onclick={addSection}>+ Add section</button>
	</div>
	<p class="editor-description">
		Add a section such as Grants, Teaching, Talks, or Service, then add entries. Reorder sections in the Layout tab.
	</p>
	{#each data.customSections as section, si (section.id)}
		<div class="editor-section">
			<div class="flex flex-wrap items-end gap-x-3 gap-y-2">
				<div class="min-w-0 flex-1 basis-48">
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
				<button
					class="editor-action-danger"
					aria-label={`Remove section ${section.heading || 'custom section'}`}
					onclick={() => removeSection(section.id)}>Remove section</button
				>
			</div>
			{#each section.entries as entry, ei (entry.id)}
				{@const path = `customSections.${si}.entries.${ei}`}
				<EntryCard
					index={ei}
					count={section.entries.length}
					label={`entry ${ei + 1} in ${section.heading || 'custom section'}`}
					onMove={(direction) =>
						(section.entries = moveWithHighlights(section.entries, `customSections.${si}.entries`, ei, direction))}
					onRemove={() => removeEntry(si, entry.id)}
				>
					<div class="editor-grid editor-grid-wide">
						<div>
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
				</EntryCard>
			{/each}
			{#if section.entries.length === 0}<p class="editor-empty">No entries in this section yet.</p>{/if}
			<div>
				<button class="editor-action" onclick={() => addEntry(si)}>+ Add entry</button>
			</div>
		</div>
	{/each}
	{#if data.customSections.length === 0}<p class="editor-empty">No custom sections added yet.</p>{/if}
</div>
