<script lang="ts">
	import type { ResumeData, ClearanceLevel, ClearanceStatus } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

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

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Clearance</h2>
		<button class="primary text-sm" onclick={addClearance}>+ Add clearance</button>
	</div>
	{#each data.clearance as clearance, i}
		<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
			<div class="flex justify-between items-start">
				<div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
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
				<button class="danger text-sm px-2 py-1 ml-2" onclick={() => removeClearance(clearance.id)}>Remove</button>
			</div>
		</div>
	{/each}
	{#if data.clearance.length === 0}<p class="text-gray-500 text-center py-8">No clearance info added yet.</p>{/if}
</div>
