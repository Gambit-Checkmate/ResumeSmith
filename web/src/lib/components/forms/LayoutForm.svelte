<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { sectionLabel, defaultSectionOrder, customSectionKey } from '$lib/types';

	let { data }: { data: ResumeData } = $props();

	function moveSection(index: number, direction: 'up' | 'down') {
		const newOrder = [...data.sectionOrder];
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= newOrder.length) return;
		[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
		data.sectionOrder = newOrder;
	}

	function resetSectionOrder() {
		data.sectionOrder = [...defaultSectionOrder, ...data.customSections.map((section) => customSectionKey(section.id))];
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Section Order</h2>
		<button class="secondary text-sm" onclick={resetSectionOrder}>Reset to Default</button>
	</div>
	<p class="text-sm text-gray-600">Use the arrows to reorder sections.</p>
	<div class="space-y-2">
		{#each data.sectionOrder as sectionId, i}
			<div class="flex items-center gap-3 bg-gray-50 border rounded-lg p-3">
				<div class="flex flex-col gap-1">
					<button
						class="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
						onclick={() => moveSection(i, 'up')}
						disabled={i === 0}
						aria-label="Move section up"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg
						>
					</button>
					<button
						class="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
						onclick={() => moveSection(i, 'down')}
						disabled={i === data.sectionOrder.length - 1}
						aria-label="Move section down"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg
						>
					</button>
				</div>
				<span class="font-medium flex-1">{sectionLabel(sectionId, data.customSections)}</span>
				<span class="text-sm text-gray-400">#{i + 1}</span>
			</div>
		{/each}
	</div>
</div>
