<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let { data }: { data: ResumeData } = $props();
</script>

<div class="space-y-4">
	<h2 class="text-lg font-semibold">Personal Information</h2>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label
				>Full Name<input
					type="text"
					bind:value={data.personalInfo.name}
					placeholder="John Doe"
					class:ai-filled={aiFilled.has('personalInfo.name')}
					oninput={() => clearHighlight('personalInfo.name')}
				/></label
			>
		</div>
		<div>
			<label
				>Email<input
					type="email"
					bind:value={data.personalInfo.email}
					placeholder="john@example.com"
					class:ai-filled={aiFilled.has('personalInfo.email')}
					oninput={() => clearHighlight('personalInfo.email')}
				/></label
			>
		</div>
		<div>
			<label
				>Phone<input
					type="tel"
					bind:value={data.personalInfo.phone}
					placeholder="(555) 123-4567"
					class:ai-filled={aiFilled.has('personalInfo.phone')}
					oninput={() => clearHighlight('personalInfo.phone')}
				/></label
			>
		</div>
		<div>
			<label
				>Website<input
					type="text"
					bind:value={data.personalInfo.website}
					placeholder="johndoe.com"
					class:ai-filled={aiFilled.has('personalInfo.website')}
					oninput={() => clearHighlight('personalInfo.website')}
				/></label
			>
		</div>
		<div>
			<label
				>LinkedIn Username<input
					type="text"
					bind:value={data.personalInfo.linkedin}
					placeholder="johndoe"
					class:ai-filled={aiFilled.has('personalInfo.linkedin')}
					oninput={() => clearHighlight('personalInfo.linkedin')}
				/></label
			>
		</div>
		<div>
			<label
				>GitHub Username<input
					type="text"
					bind:value={data.personalInfo.github}
					placeholder="johndoe"
					class:ai-filled={aiFilled.has('personalInfo.github')}
					oninput={() => clearHighlight('personalInfo.github')}
				/></label
			>
		</div>
	</div>
</div>
