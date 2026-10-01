<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import EntryCard from '../EntryCard.svelte';
	import DateRange from '../DateRange.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addEducation() {
		data.education = [
			...data.education,
			{
				id: generateId(),
				institution: '',
				location: '',
				degree: '',
				major: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [''],
			},
		];
	}
	function removeEducation(id: string) {
		data.education = data.education.filter((e) => e.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Education</h2>
		<button class="primary text-sm" onclick={addEducation}>+ Add education</button>
	</div>
	{#each data.education as edu, i}
		<EntryCard index={i} onRemove={() => removeEducation(edu.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label
						>Institution<input
							type="text"
							bind:value={edu.institution}
							placeholder="University Name"
							class:ai-filled={aiFilled.has(`education.${i}.institution`)}
							oninput={() => clearHighlight(`education.${i}.institution`)}
						/></label
					>
				</div>
				<div>
					<label
						>Location<input
							type="text"
							bind:value={edu.location}
							placeholder="City, State"
							class:ai-filled={aiFilled.has(`education.${i}.location`)}
							oninput={() => clearHighlight(`education.${i}.location`)}
						/></label
					>
				</div>
				<div>
					<label
						>Degree<input
							type="text"
							bind:value={edu.degree}
							placeholder="Bachelor of Sciences"
							class:ai-filled={aiFilled.has(`education.${i}.degree`)}
							oninput={() => clearHighlight(`education.${i}.degree`)}
						/></label
					>
				</div>
				<div>
					<label
						>Major<input
							type="text"
							bind:value={edu.major}
							placeholder="Computer Science"
							class:ai-filled={aiFilled.has(`education.${i}.major`)}
							oninput={() => clearHighlight(`education.${i}.major`)}
						/></label
					>
				</div>
				<DateRange
					bind:startDate={edu.startDate}
					bind:endDate={edu.endDate}
					bind:isPresent={edu.isPresent}
					path={`education.${i}`}
					endLabel="End Date (Expected)"
					presentLabel="Currently studying"
				/>
			</div>
			<BulletEditor
				bind:bullets={edu.bullets}
				label="Honors/GPA"
				path={`education.${i}.bullets`}
				placeholder="Relevant coursework, honors, GPA..."
			/>
		</EntryCard>
	{/each}
	{#if data.education.length === 0}<p class="text-gray-500 text-center py-8">No education added yet.</p>{/if}
</div>
