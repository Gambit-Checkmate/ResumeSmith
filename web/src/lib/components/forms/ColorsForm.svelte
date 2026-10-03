<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { defaultResumeData } from '$lib/types';

	let { data }: { data: ResumeData } = $props();

	function resetColorSettings() {
		data.colors = { ...defaultResumeData.colors };
	}
	const uid = $props.id();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Color Settings</h2>
		<button class="secondary text-sm" onclick={resetColorSettings}>Reset to Default</button>
	</div>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for={`${uid}-header-color`}>Header Color</label>
			<input
				id={`${uid}-header-color`}
				type="color"
				bind:value={data.colors.headColor}
				class="w-full h-10 p-1 rounded cursor-pointer"
			/>
		</div>
		<div>
			<label for={`${uid}-text-color`}>Text Color</label>
			<input
				id={`${uid}-text-color`}
				type="color"
				bind:value={data.colors.textColor}
				class="w-full h-10 p-1 rounded cursor-pointer"
			/>
		</div>
		<div>
			<label for={`${uid}-accent-color`}>Accent Color</label>
			<input
				id={`${uid}-accent-color`}
				type="color"
				bind:value={data.colors.accentColor}
				class="w-full h-10 p-1 rounded cursor-pointer"
			/>
		</div>
		<div>
			<label for={`${uid}-link-color`}>Link Color</label>
			<input
				id={`${uid}-link-color`}
				type="color"
				bind:value={data.colors.linkColor}
				class="w-full h-10 p-1 rounded cursor-pointer"
			/>
		</div>
	</div>
</div>
