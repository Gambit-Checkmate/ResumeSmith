<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import EntryCard from '../EntryCard.svelte';
	import DateRange from '../DateRange.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addLeadership() {
		data.leadership = [
			...data.leadership,
			{
				id: generateId(),
				title: '',
				organization: '',
				location: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [''],
			},
		];
	}
	function removeLeadership(id: string) {
		data.leadership = data.leadership.filter((l) => l.id !== id);
	}
	const uid = $props.id();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Leadership</h2>
		<button class="primary text-sm" onclick={addLeadership}>+ Add role</button>
	</div>
	{#each data.leadership as lead, i}
		<EntryCard index={i} onRemove={() => removeLeadership(lead.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label for={`${uid}-${i}-title`}>Title</label>
					<input
						id={`${uid}-${i}-title`}
						type="text"
						bind:value={lead.title}
						placeholder="Team Lead"
						class:ai-filled={aiFilled.has(`leadership.${i}.title`)}
						oninput={() => clearHighlight(`leadership.${i}.title`)}
					/>
				</div>
				<div>
					<label for={`${uid}-${i}-organization`}>Organization</label>
					<input
						id={`${uid}-${i}-organization`}
						type="text"
						bind:value={lead.organization}
						placeholder="Organization Name"
						class:ai-filled={aiFilled.has(`leadership.${i}.organization`)}
						oninput={() => clearHighlight(`leadership.${i}.organization`)}
					/>
				</div>
				<div class="md:col-span-2">
					<label for={`${uid}-${i}-location`}>Location</label>
					<input
						id={`${uid}-${i}-location`}
						type="text"
						bind:value={lead.location}
						placeholder="City, State"
						class:ai-filled={aiFilled.has(`leadership.${i}.location`)}
						oninput={() => clearHighlight(`leadership.${i}.location`)}
					/>
				</div>
				<DateRange
					bind:startDate={lead.startDate}
					bind:endDate={lead.endDate}
					bind:isPresent={lead.isPresent}
					path={`leadership.${i}`}
					presentLabel="Currently active"
				/>
			</div>
			<BulletEditor
				bind:bullets={lead.bullets}
				label="Responsibilities"
				path={`leadership.${i}.bullets`}
				placeholder="Describe your leadership responsibilities..."
			/>
		</EntryCard>
	{/each}
	{#if data.leadership.length === 0}<p class="text-gray-500 text-center py-8">No leadership roles added yet.</p>{/if}
</div>
