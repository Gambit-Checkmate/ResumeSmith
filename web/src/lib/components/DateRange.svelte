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
	<label class="present">
		<input type="checkbox" bind:checked={isPresent} />
		<span>{presentLabel}</span>
	</label>
</div>

<style>
	.present {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.5rem 0 0;
		font-size: 0.875rem;
		font-weight: 400;
		color: var(--color-gray-600, #4b5563);
		cursor: pointer;
		user-select: none;
	}

	.present input {
		width: 1rem;
		height: 1rem;
		border-radius: 0.25rem;
		accent-color: var(--color-blue-600, #2563eb);
	}

	.present input:focus-visible {
		outline: 2px solid var(--color-blue-500, #3b82f6);
		outline-offset: 2px;
	}

	.present:has(input:disabled) {
		cursor: not-allowed;
	}
</style>
