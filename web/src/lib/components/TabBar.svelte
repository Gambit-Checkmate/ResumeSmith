<script lang="ts">
	import { groupTabs, type EditorTab } from '$lib/tab-groups';

	let { tabs, activeTab = $bindable() }: { tabs: EditorTab[]; activeTab: string } = $props();

	let groups = $derived(groupTabs(tabs));
	let moreOpen = $state(false);
	let nav = $state<HTMLElement>();
	let moreButton = $state<HTMLButtonElement>();
	let activeInMore = $derived(groups.more.find((tab) => tab.id === activeTab));

	// The disclosure stays open until the person closes it, so picking a section never shifts the layout.
	function onMoreKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !moreOpen || !nav?.contains(document.activeElement)) return;
		event.preventDefault();
		moreOpen = false;
		moreButton?.focus();
	}
</script>

{#snippet tabButton(tab: EditorTab)}
	<button
		type="button"
		class="tab text-sm {activeTab === tab.id
			? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200'
			: 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}"
		aria-current={activeTab === tab.id ? 'true' : undefined}
		onclick={() => (activeTab = tab.id)}>{tab.label}</button
	>
{/snippet}

<svelte:window onkeydown={onMoreKeydown} />

<nav bind:this={nav} class="mb-5 space-y-2 border-b pb-4" aria-label="Editor sections">
	<div class="track" role="group" aria-label="Content">
		{#each groups.primary as tab (tab.id)}
			{@render tabButton(tab)}
		{/each}
		{#if groups.more.length > 0}
			<button
				bind:this={moreButton}
				type="button"
				class="tab text-sm inline-flex items-center gap-1 {activeInMore && !moreOpen
					? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200'
					: 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}"
				aria-expanded={moreOpen}
				aria-controls="tabbar-more"
				onclick={() => (moreOpen = !moreOpen)}
			>
				More{#if activeInMore && !moreOpen}<span class="sr-only">, current section:</span>
					<span aria-hidden="true">·</span>
					{activeInMore.label}{/if}
				<svg
					class="disclosure-chevron h-4 w-4"
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
				</svg>
			</button>
		{/if}
	</div>
	{#if moreOpen}
		<div id="tabbar-more" class="track" role="group" aria-label="More content sections">
			{#each groups.more as tab (tab.id)}
				{@render tabButton(tab)}
			{/each}
		</div>
	{/if}
	{#if groups.appearance.length > 0}
		<div class="flex items-center gap-2" role="group" aria-labelledby="tabbar-appearance">
			<p id="tabbar-appearance" class="appearance-label">Appearance</p>
			<div class="track">
				{#each groups.appearance as tab (tab.id)}
					{@render tabButton(tab)}
				{/each}
			</div>
		</div>
	{/if}
</nav>

<style>
	.disclosure-chevron {
		transform: rotate(0deg);
	}

	button[aria-expanded='true'] .disclosure-chevron {
		transform: rotate(180deg);
	}

	/* The global button rule in app.css is unlayered, so sizes are set here rather than with utilities. */
	.appearance-label {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.025em;
		text-transform: uppercase;
		color: var(--color-gray-500);
	}

	.track {
		display: flex;
		flex-wrap: wrap;
		gap: 0.125rem;
		border-radius: 0.5rem;
		background-color: var(--color-gray-100);
		padding: 0.125rem;
	}

	.tab {
		padding: 0.3125rem 0.625rem;
		white-space: nowrap;
	}

	.tab:focus-visible {
		outline: 2px solid var(--color-blue-500);
		outline-offset: 1px;
	}

	/* Keep the disclosed row at its final size throughout the entrance. */
	@media (prefers-reduced-motion: no-preference) {
		.tab {
			transition:
				background-color 140ms ease-out,
				color 140ms ease-out,
				box-shadow 140ms ease-out,
				transform 100ms ease-out;
		}

		.tab:active {
			transform: translateY(1px);
		}

		.disclosure-chevron {
			transition: transform 160ms ease-out;
		}

		#tabbar-more {
			animation: sections-reveal 160ms ease-out;
		}
	}

	@keyframes sections-reveal {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tab {
			transition: none;
		}
	}
</style>
