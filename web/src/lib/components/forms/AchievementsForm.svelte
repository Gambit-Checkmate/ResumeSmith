<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { moveWithHighlights } from '$lib/reorder';
	import EntryCard from '../EntryCard.svelte';

	let { data }: { data: ResumeData } = $props();

	function addAchievement() {
		data.achievements = [...data.achievements, { id: generateId(), title: '', date: '', description: '' }];
	}
	function removeAchievement(id: string) {
		data.achievements = data.achievements.filter((a) => a.id !== id);
	}
	const uid = $props.id();
</script>

<div class="editor-form">
	<div class="editor-heading">
		<h2>Achievements / Certifications</h2>
		<button class="primary editor-add" onclick={addAchievement}>+ Add achievement</button>
	</div>
	{#each data.achievements as achievement, i (achievement.id)}
		<EntryCard
			index={i}
			count={data.achievements.length}
			label={`achievement ${i + 1}`}
			onMove={(direction) => (data.achievements = moveWithHighlights(data.achievements, 'achievements', i, direction))}
			onRemove={() => removeAchievement(achievement.id)}
		>
			<div class="editor-grid">
				<div>
					<label for={`${uid}-${i}-title`}>Title</label>
					<input
						id={`${uid}-${i}-title`}
						type="text"
						bind:value={achievement.title}
						placeholder="AWS Certified Developer"
						class:ai-filled={aiFilled.has(`achievements.${i}.title`)}
						oninput={() => clearHighlight(`achievements.${i}.title`)}
					/>
				</div>
				<div>
					<label for={`${uid}-${i}-date`}>Date</label>
					<input
						id={`${uid}-${i}-date`}
						type="month"
						bind:value={achievement.date}
						class:ai-filled={aiFilled.has(`achievements.${i}.date`)}
						oninput={() => clearHighlight(`achievements.${i}.date`)}
					/>
				</div>
				<div class="editor-span">
					<label for={`${uid}-${i}-description`}>Description</label>
					<textarea
						id={`${uid}-${i}-description`}
						bind:value={achievement.description}
						rows="2"
						placeholder="Brief description of the achievement or certification..."
						class:ai-filled={aiFilled.has(`achievements.${i}.description`)}
						oninput={() => clearHighlight(`achievements.${i}.description`)}
					></textarea>
				</div>
			</div>
		</EntryCard>
	{/each}
	{#if data.achievements.length === 0}<p class="editor-empty">No achievements added yet.</p>{/if}
</div>
