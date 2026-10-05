<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { moveWithHighlights } from '$lib/reorder';
	import EntryCard from '../EntryCard.svelte';

	let { data }: { data: ResumeData } = $props();

	function addSkillCategory() {
		data.skills = [...data.skills, { id: generateId(), category: '', skills: '' }];
	}
	function removeSkillCategory(id: string) {
		data.skills = data.skills.filter((s) => s.id !== id);
	}
	const uid = $props.id();
</script>

<div class="editor-form">
	<div class="editor-heading">
		<h2>Skills</h2>
		<button class="primary editor-add" onclick={addSkillCategory}>+ Add category</button>
	</div>
	{#each data.skills as skill, i (skill.id)}
		<EntryCard
			index={i}
			count={data.skills.length}
			label={`skill category ${i + 1}`}
			onMove={(direction) => (data.skills = moveWithHighlights(data.skills, 'skills', i, direction))}
			onRemove={() => removeSkillCategory(skill.id)}
		>
			<div class="editor-grid">
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
		</EntryCard>
	{/each}
	{#if data.skills.length === 0}<p class="editor-empty">No skills added yet.</p>{/if}
</div>
