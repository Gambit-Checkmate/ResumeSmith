<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let { data }: { data: ResumeData } = $props();
	const uid = $props.id();
</script>

<div class="space-y-4">
	<h2 class="text-lg font-semibold">Personal Information</h2>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for={`${uid}-full-name`}>Full Name</label>
			<input
				id={`${uid}-full-name`}
				type="text"
				bind:value={data.personalInfo.name}
				placeholder="John Doe"
				class:ai-filled={aiFilled.has('personalInfo.name')}
				oninput={() => clearHighlight('personalInfo.name')}
			/>
		</div>
		<div>
			<label for={`${uid}-email`}>Email</label>
			<input
				id={`${uid}-email`}
				type="email"
				bind:value={data.personalInfo.email}
				placeholder="john@example.com"
				class:ai-filled={aiFilled.has('personalInfo.email')}
				oninput={() => clearHighlight('personalInfo.email')}
			/>
		</div>
		<div>
			<label for={`${uid}-phone`}>Phone</label>
			<input
				id={`${uid}-phone`}
				type="tel"
				bind:value={data.personalInfo.phone}
				placeholder="(555) 123-4567"
				class:ai-filled={aiFilled.has('personalInfo.phone')}
				oninput={() => clearHighlight('personalInfo.phone')}
			/>
		</div>
		<div>
			<label for={`${uid}-website`}>Website</label>
			<input
				id={`${uid}-website`}
				type="text"
				bind:value={data.personalInfo.website}
				placeholder="johndoe.com"
				class:ai-filled={aiFilled.has('personalInfo.website')}
				oninput={() => clearHighlight('personalInfo.website')}
			/>
		</div>
		<div>
			<label for={`${uid}-linkedin-username`}>LinkedIn Username</label>
			<input
				id={`${uid}-linkedin-username`}
				type="text"
				bind:value={data.personalInfo.linkedin}
				placeholder="johndoe"
				class:ai-filled={aiFilled.has('personalInfo.linkedin')}
				oninput={() => clearHighlight('personalInfo.linkedin')}
			/>
		</div>
		<div>
			<label for={`${uid}-github-username`}>GitHub Username</label>
			<input
				id={`${uid}-github-username`}
				type="text"
				bind:value={data.personalInfo.github}
				placeholder="johndoe"
				class:ai-filled={aiFilled.has('personalInfo.github')}
				oninput={() => clearHighlight('personalInfo.github')}
			/>
		</div>
	</div>
</div>
