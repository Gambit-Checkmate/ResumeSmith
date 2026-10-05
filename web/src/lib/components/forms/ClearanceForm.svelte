<script lang="ts">
	import type { ResumeData, ClearanceLevel, ClearanceStatus } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { moveWithHighlights } from '$lib/reorder';
	import EntryCard from '../EntryCard.svelte';

	let { data }: { data: ResumeData } = $props();

	const LEVELS: ClearanceLevel[] = ['Confidential', 'Secret', 'Top Secret', 'Top Secret/SCI', 'Public Trust'];
	const STATUSES: ClearanceStatus[] = ['Active', 'Inactive', 'Eligible'];

	function addClearance() {
		data.clearance = [...data.clearance, { id: generateId(), level: 'Secret', status: 'Active', dateGranted: '' }];
	}
	function removeClearance(id: string) {
		data.clearance = data.clearance.filter((c) => c.id !== id);
	}
	const uid = $props.id();
</script>

<div class="editor-form">
	<div class="editor-heading">
		<h2>Clearance</h2>
		<button class="primary editor-add" onclick={addClearance}>+ Add clearance</button>
	</div>
	{#each data.clearance as clearance, i (clearance.id)}
		<EntryCard
			index={i}
			count={data.clearance.length}
			label={`clearance ${i + 1}`}
			onMove={(direction) => (data.clearance = moveWithHighlights(data.clearance, 'clearance', i, direction))}
			onRemove={() => removeClearance(clearance.id)}
		>
			<div class="editor-grid">
				<div>
					<label for={`${uid}-${i}-level`}>Level</label>
					<select
						id={`${uid}-${i}-level`}
						bind:value={clearance.level}
						class:ai-filled={aiFilled.has(`clearance.${i}.level`)}
						onchange={() => clearHighlight(`clearance.${i}.level`)}
					>
						{#each LEVELS as level}
							<option value={level}>{level}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for={`${uid}-${i}-status`}>Status</label>
					<select
						id={`${uid}-${i}-status`}
						bind:value={clearance.status}
						class:ai-filled={aiFilled.has(`clearance.${i}.status`)}
						onchange={() => clearHighlight(`clearance.${i}.status`)}
					>
						{#each STATUSES as status}
							<option value={status}>{status}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for={`${uid}-${i}-date-granted`}>Date Granted</label>
					<input
						id={`${uid}-${i}-date-granted`}
						type="month"
						bind:value={clearance.dateGranted}
						class:ai-filled={aiFilled.has(`clearance.${i}.dateGranted`)}
						oninput={() => clearHighlight(`clearance.${i}.dateGranted`)}
					/>
				</div>
			</div>
		</EntryCard>
	{/each}
	{#if data.clearance.length === 0}<p class="editor-empty">No clearance info added yet.</p>{/if}
</div>
