<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { defaultResumeData } from '$lib/types';

	let { data }: { data: ResumeData } = $props();

	function resetColorSettings() {
		data.colors = { ...defaultResumeData.colors };
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Color Settings</h2>
		<button class="secondary text-sm" onclick={resetColorSettings}>Reset to Default</button>
	</div>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label
				>Header Color<input
					type="color"
					bind:value={data.colors.headColor}
					class="w-full h-10 p-1 rounded cursor-pointer"
				/></label
			>
		</div>
		<div>
			<label
				>Text Color<input
					type="color"
					bind:value={data.colors.textColor}
					class="w-full h-10 p-1 rounded cursor-pointer"
				/></label
			>
		</div>
		<div>
			<label
				>Accent Color<input
					type="color"
					bind:value={data.colors.accentColor}
					class="w-full h-10 p-1 rounded cursor-pointer"
				/></label
			>
		</div>
		<div>
			<label
				>Link Color<input
					type="color"
					bind:value={data.colors.linkColor}
					class="w-full h-10 p-1 rounded cursor-pointer"
				/></label
			>
		</div>
	</div>
</div>
