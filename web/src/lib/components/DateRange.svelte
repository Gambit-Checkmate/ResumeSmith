<script lang="ts">
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let {
		startDate = $bindable(),
		endDate = $bindable(),
		isPresent = $bindable(),
		path = '',
		endLabel = 'End Date',
		presentLabel = 'Currently active',
	}: {
		startDate: string;
		endDate: string;
		isPresent: boolean;
		path?: string;
		endLabel?: string;
		presentLabel?: string;
	} = $props();
	const uid = $props.id();
</script>

<div>
	<label for={`${uid}-start-date`}>Start Date</label>
	<input
		id={`${uid}-start-date`}
		type="month"
		bind:value={startDate}
		class:ai-filled={aiFilled.has(`${path}.startDate`)}
		oninput={() => clearHighlight(`${path}.startDate`)}
	/>
</div>
<div>
	<label for={`${uid}-end-date`}>{endLabel}</label>
	<input
		id={`${uid}-end-date`}
		type="month"
		bind:value={endDate}
		disabled={isPresent}
		class:ai-filled={aiFilled.has(`${path}.endDate`)}
		oninput={() => clearHighlight(`${path}.endDate`)}
	/>
	<label class="flex items-center gap-2 mt-2 cursor-pointer select-none">
		<input type="checkbox" bind:checked={isPresent} class="w-4 h-4 rounded" />
		<span class="text-sm text-gray-600">{presentLabel}</span>
	</label>
</div>
