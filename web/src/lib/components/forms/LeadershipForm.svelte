<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { moveWithHighlights } from '$lib/reorder';
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

<div class="editor-form">
	<div class="editor-heading">
		<h2>Leadership</h2>
		<button class="primary editor-add" onclick={addLeadership}>+ Add role</button>
	</div>
	{#each data.leadership as lead, i (lead.id)}
		<EntryCard
			index={i}
			count={data.leadership.length}
			label={`leadership role ${i + 1}`}
			onMove={(direction) => (data.leadership = moveWithHighlights(data.leadership, 'leadership', i, direction))}
			onRemove={() => removeLeadership(lead.id)}
		>
			<div class="editor-grid">
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
				<div class="editor-span">
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
	{#if data.leadership.length === 0}<p class="editor-empty">No leadership roles added yet.</p>{/if}
</div>
