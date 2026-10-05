<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let { data }: { data: ResumeData } = $props();
</script>

<div class="editor-form">
	<div class="editor-heading">
		<h2>Profile Summary</h2>
	</div>
	<textarea
		aria-label="Profile summary"
		bind:value={data.profile.summary}
		rows="5"
		placeholder="A brief summary of your background, skills, and career objectives..."
		class:ai-filled={aiFilled.has('profile.summary')}
		oninput={() => clearHighlight('profile.summary')}
	></textarea>
</div>
