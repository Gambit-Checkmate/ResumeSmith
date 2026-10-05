<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let { data }: { data: ResumeData } = $props();

	function addSkillCategory() {
		data.skills = [...data.skills, { id: generateId(), category: '', skills: '' }];
	}
	function removeSkillCategory(id: string) {
		data.skills = data.skills.filter((s) => s.id !== id);
	}
	const uid = $props.id();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Skills</h2>
		<button class="primary text-sm" onclick={addSkillCategory}>+ Add category</button>
	</div>
	{#each data.skills as skill, i}
		<div class="border rounded-lg p-4 bg-gray-50">
			<div class="flex gap-3 items-start">
				<div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label for={`${uid}-${i}-category`}>Category</label>
						<input
							id={`${uid}-${i}-category`}
							type="text"
							bind:value={skill.category}
							placeholder="Languages"
							class:ai-filled={aiFilled.has(`skills.${i}.category`)}
							oninput={() => clearHighlight(`skills.${i}.category`)}
						/>
					</div>
					<div>
						<label for={`${uid}-${i}-skills`}>Skills</label>
						<input
							id={`${uid}-${i}-skills`}
							type="text"
							bind:value={skill.skills}
							placeholder="Python, TypeScript, C++"
							class:ai-filled={aiFilled.has(`skills.${i}.skills`)}
							oninput={() => clearHighlight(`skills.${i}.skills`)}
						/>
					</div>
				</div>
				<button class="danger text-sm px-2 py-1" onclick={() => removeSkillCategory(skill.id)}>Remove</button>
			</div>
		</div>
	{/each}
	{#if data.skills.length === 0}<p class="text-gray-500 text-center py-8">No skills added yet.</p>{/if}
</div>
