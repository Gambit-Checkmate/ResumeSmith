<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { sectionLabel, defaultSectionOrder, customSectionKey } from '$lib/types';
	import { moveAt, type MoveDirection } from '$lib/reorder';
	import MoveControls from '$lib/components/MoveControls.svelte';

	let { data }: { data: ResumeData } = $props();

	function moveSection(index: number, direction: MoveDirection) {
		data.sectionOrder = moveAt(data.sectionOrder, index, direction);
	}

	function resetSectionOrder() {
		data.sectionOrder = [...defaultSectionOrder, ...data.customSections.map((section) => customSectionKey(section.id))];
	}
</script>

<div class="editor-form">
	<div class="editor-heading">
		<h2>Section Order</h2>
		<button type="button" class="editor-action" onclick={resetSectionOrder}>Reset to Default</button>
	</div>
	<p class="editor-description">Use the arrows to reorder sections.</p>
	<ol class="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white" aria-label="Section order">
		{#each data.sectionOrder as sectionId, i (sectionId)}
			{@const label = sectionLabel(sectionId, data.customSections)}
			<li class="flex items-center gap-3 px-3 py-2">
				<span class="w-5 shrink-0 text-right text-xs tabular-nums text-gray-400" aria-hidden="true">{i + 1}</span>
				<span class="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{label}</span>
				<MoveControls
					index={i}
					count={data.sectionOrder.length}
					{label}
					onMove={(direction) => moveSection(i, direction)}
				/>
			</li>
		{/each}
	</ol>
</div>
