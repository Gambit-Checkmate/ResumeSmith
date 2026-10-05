<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import EntryCard from '../EntryCard.svelte';
	import DateRange from '../DateRange.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addWorkExperience() {
		data.workExperience = [
			...data.workExperience,
			{
				id: generateId(),
				title: '',
				company: '',
				location: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [''],
			},
		];
	}
	function removeWorkExperience(id: string) {
		data.workExperience = data.workExperience.filter((w) => w.id !== id);
	}
	const uid = $props.id();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Work Experience</h2>
		<button class="primary text-sm" onclick={addWorkExperience}>+ Add job</button>
	</div>
	{#each data.workExperience as work, i}
		<EntryCard index={i} onRemove={() => removeWorkExperience(work.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label for={`${uid}-${i}-job-title`}>Job Title</label>
					<input
						id={`${uid}-${i}-job-title`}
						type="text"
						bind:value={work.title}
						placeholder="Software Engineer"
						class:ai-filled={aiFilled.has(`workExperience.${i}.title`)}
						oninput={() => clearHighlight(`workExperience.${i}.title`)}
					/>
				</div>
				<div>
					<label for={`${uid}-${i}-company`}>Company</label>
					<input
						id={`${uid}-${i}-company`}
						type="text"
						bind:value={work.company}
						placeholder="Company Name"
						class:ai-filled={aiFilled.has(`workExperience.${i}.company`)}
						oninput={() => clearHighlight(`workExperience.${i}.company`)}
					/>
				</div>
				<div class="md:col-span-2">
					<label for={`${uid}-${i}-location`}>Location</label>
					<input
						id={`${uid}-${i}-location`}
						type="text"
						bind:value={work.location}
						placeholder="City, State"
						class:ai-filled={aiFilled.has(`workExperience.${i}.location`)}
						oninput={() => clearHighlight(`workExperience.${i}.location`)}
					/>
				</div>
				<DateRange
					bind:startDate={work.startDate}
					bind:endDate={work.endDate}
					bind:isPresent={work.isPresent}
					path={`workExperience.${i}`}
					presentLabel="Currently working here"
				/>
			</div>
			<BulletEditor
				bind:bullets={work.bullets}
				label="Responsibilities"
				path={`workExperience.${i}.bullets`}
				placeholder="Describe your responsibilities and achievements..."
			/>
		</EntryCard>
	{/each}
	{#if data.workExperience.length === 0}<p class="text-gray-500 text-center py-8">No experience added yet.</p>{/if}
</div>
