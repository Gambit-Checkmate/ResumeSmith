<script lang="ts">
	import { tick } from 'svelte';
	import { nextMenuIndex } from '$lib/menu-navigation';
	import { documentTypes, documentTypeLabels, type DocumentType } from '$lib/types';

	let {
		documentType,
		onDocumentTypeChange,
		showCode = $bindable(),
		isCompiling,
		compileError,
		compiledPageCount,
		estimatedOverOnePage,
		onDownload,
		onDownloadTypst,
		onCopyText,
		onDownloadText,
		textExportStatus,
		onBackup,
		onUpload,
		onTemplate,
		onTailor,
		hasCustomTemplate,
	}: {
		documentType: DocumentType;
		onDocumentTypeChange: (documentType: DocumentType) => void;
		showCode: boolean;
		isCompiling: boolean;
		compileError: string | null;
		compiledPageCount: number | null;
		estimatedOverOnePage: boolean;
		onDownload: () => void;
		onDownloadTypst: () => void;
		onCopyText: () => void;
		onDownloadText: () => void;
		textExportStatus: string;
		onBackup: () => void;
		onUpload: () => void;
		onTemplate: () => void;
		onTailor: () => void;
		hasCustomTemplate: boolean;
	} = $props();

	let menuOpen = $state(false);
	let menuButton = $state<HTMLButtonElement>();
	let menuPanel = $state<HTMLDivElement>();
	let importLabel = $derived(documentType === 'cv' ? 'Import CV' : 'Import resume');

	// Items hidden by a breakpoint are skipped so the arrow keys only reach what is shown.
	function menuItems() {
		return Array.from(menuPanel?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []).filter(
			(item) => item.getClientRects().length > 0,
		);
	}

	async function openMenu(focus: 'first' | 'last' = 'first') {
		menuOpen = true;
		await tick();
		const items = menuItems();
		items[focus === 'first' ? 0 : items.length - 1]?.focus();
	}

	function closeMenu(restoreFocus = true) {
		if (!menuOpen) return;
		menuOpen = false;
		if (restoreFocus) menuButton?.focus();
	}

	// Focus returns to the trigger before the action runs, so a dialog it opens restores focus there.
	function choose(action: () => void) {
		closeMenu();
		action();
	}

	function onMenuButtonKeydown(event: KeyboardEvent) {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		event.preventDefault();
		void openMenu(event.key === 'ArrowDown' ? 'first' : 'last');
	}

	function onMenuKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeMenu();
			return;
		}
		// Tab leaves the menu from the trigger's place in the tab order.
		if (event.key === 'Tab') {
			closeMenu();
			return;
		}
		const items = menuItems();
		const next = nextMenuIndex(event.key, items.indexOf(document.activeElement as HTMLElement), items.length);
		if (next === null) return;
		event.preventDefault();
		items[next].focus();
	}

	function isInsideMenu(target: EventTarget | null) {
		return target instanceof Node && (menuPanel?.contains(target) || menuButton?.contains(target));
	}

	$effect(() => {
		if (!menuOpen) return;
		const dismiss = (event: PointerEvent) => {
			if (!isInsideMenu(event.target)) closeMenu(false);
		};
		document.addEventListener('pointerdown', dismiss);
		return () => document.removeEventListener('pointerdown', dismiss);
	});
</script>

{#snippet menuItem(label: string, hint: string, action: () => void)}
	<button
		type="button"
		role="menuitem"
		tabindex="-1"
		class="menu-item block w-full text-left hover:bg-gray-100 focus:bg-blue-50 focus:outline-none"
		onclick={() => choose(action)}
	>
		<span class="block text-sm font-medium text-gray-900">{label}</span>
		<span class="block text-xs text-gray-500">{hint}</span>
	</button>
{/snippet}

<header class="relative z-30 bg-white shadow-sm">
	<div class="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-2 lg:gap-x-4">
				<h1 class="text-xl lg:text-2xl font-bold text-gray-900">ResumeSmith</h1>
				<div class="flex rounded-md bg-gray-200 p-0.5" role="group" aria-label="Document type">
					{#each documentTypes as type}
						<button
							class="segment text-sm {documentType === type
								? 'bg-white text-gray-900 shadow-sm'
								: 'text-gray-600 hover:text-gray-900'}"
							aria-pressed={documentType === type}
							onclick={() => onDocumentTypeChange(type)}>{documentTypeLabels[type]}</button
						>
					{/each}
				</div>
			</div>
			<div class="relative ml-auto flex items-center gap-2 max-sm:w-full max-sm:flex-wrap">
				<!-- Below xl these three move into the More menu so the bar stays on one line. -->
				<div class="hidden xl:flex items-center gap-1">
					<button class="quiet text-sm" onclick={onUpload} title="Fill the form from an existing resume or CV"
						>{importLabel}</button
					>
					<button class="quiet text-sm" onclick={onTemplate} title="Change the resume layout">
						Template{#if hasCustomTemplate}<span class="sr-only">:</span>
							<span class="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">custom</span
							>{/if}
					</button>
					{#if documentType === 'resume'}
						<button class="quiet text-sm" onclick={onTailor} title="Match your resume to a job">Tailor to job</button>
					{/if}
				</div>
				<span class="hidden xl:block h-6 w-px bg-gray-200" aria-hidden="true"></span>
				<div class="flex rounded-md bg-gray-200 p-0.5" role="group" aria-label="Right panel view">
					<button
						class="segment text-sm {showCode
							? 'text-gray-600 hover:text-gray-900'
							: 'bg-white text-gray-900 shadow-sm'}"
						aria-pressed={!showCode}
						onclick={() => (showCode = false)}>Preview</button
					>
					<button
						class="segment text-sm {showCode
							? 'bg-white text-gray-900 shadow-sm'
							: 'text-gray-600 hover:text-gray-900'}"
						aria-pressed={showCode}
						onclick={() => (showCode = true)}>Code</button
					>
				</div>
				<button
					bind:this={menuButton}
					class="secondary compact text-sm inline-flex items-center gap-1 max-sm:ml-auto"
					aria-haspopup="menu"
					aria-expanded={menuOpen}
					aria-controls="header-more-menu"
					onclick={() => (menuOpen ? closeMenu() : void openMenu())}
					onkeydown={onMenuButtonKeydown}
				>
					More
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
				<button class="primary compact text-sm disabled:opacity-60" onclick={onDownload} disabled={isCompiling}>
					{isCompiling ? 'Generating...' : 'Download PDF'}
				</button>
				{#if menuOpen}
					<div
						bind:this={menuPanel}
						id="header-more-menu"
						class="absolute right-0 top-full z-40 mt-2 max-h-[70vh] w-72 max-w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg sm:max-w-none"
						role="menu"
						aria-label="More actions"
						tabindex="-1"
						onkeydown={onMenuKeydown}
						onfocusout={(event) => {
							if (event.relatedTarget && !isInsideMenu(event.relatedTarget)) closeMenu(false);
						}}
					>
						<div class="xl:hidden" role="group" aria-labelledby="header-menu-document">
							<p id="header-menu-document" class="menu-heading">Document</p>
							{@render menuItem(importLabel, 'Fill the form from an existing resume or CV', onUpload)}
							{@render menuItem(
								hasCustomTemplate ? 'Template: custom' : 'Template',
								'Change the resume layout',
								onTemplate,
							)}
							{#if documentType === 'resume'}
								{@render menuItem('Tailor to job', 'Match your resume to a job', onTailor)}
							{/if}
							<div class="my-1 border-t border-gray-200" role="separator"></div>
						</div>
						<div role="group" aria-labelledby="header-menu-formats">
							<p id="header-menu-formats" class="menu-heading">Other formats</p>
							{@render menuItem(
								'Download Typst',
								'The Typst source, or the empty template if there is no content yet',
								onDownloadTypst,
							)}
							{@render menuItem('Copy resume text', 'Readable text for application forms', onCopyText)}
							{@render menuItem('Download .txt', 'The same readable text as a file', onDownloadText)}
						</div>
						<div class="my-1 border-t border-gray-200" role="separator"></div>
						<div role="group" aria-labelledby="header-menu-data">
							<p id="header-menu-data" class="menu-heading">Your data</p>
							{@render menuItem('Backup / restore', 'Download or restore editable resume data', onBackup)}
						</div>
					</div>
				{/if}
			</div>
		</div>
		{#if compileError}
			<div class="mt-3 px-3 py-2 bg-red-50 border border-red-300 text-red-700 rounded text-sm" role="alert">
				{compileError}
			</div>
		{/if}
		<p class="sr-only" role="status" aria-live="polite">{textExportStatus}</p>
		{#if documentType === 'cv'}
			{#if compiledPageCount !== null}
				<p class="mt-2 text-sm text-gray-600" aria-live="polite">
					Your CV is {compiledPageCount}
					{compiledPageCount === 1 ? 'page' : 'pages'}.
				</p>
			{/if}
		{:else if compiledPageCount !== null && compiledPageCount > 1}
			<div class="mt-3 px-3 py-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded text-sm">
				Your resume is {compiledPageCount} pages.
			</div>
		{:else if compiledPageCount === null && estimatedOverOnePage}
			<div class="mt-3 px-3 py-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded text-sm">
				Your resume may be over one page.
			</div>
		{/if}
	</div>
</header>

<style>
	.disclosure-chevron {
		transform: rotate(0deg);
	}

	button[aria-expanded='true'] .disclosure-chevron {
		transform: rotate(180deg);
	}

	/* The global button rule in app.css is unlayered, so these sizes are set here rather than with utilities. */
	.segment {
		padding: 0.375rem 0.75rem;
	}

	.compact,
	.quiet {
		padding: 0.5rem 0.75rem;
		white-space: nowrap;
	}

	.quiet {
		color: var(--color-gray-700);
	}

	.quiet:hover {
		background-color: var(--color-gray-100);
		color: var(--color-gray-900);
	}

	/* Phone widths: keep both rows of the bar inside a 360px viewport. */
	@media (width < 40rem) {
		.segment,
		.compact {
			padding-inline: 0.5rem;
		}
	}

	.menu-item {
		padding: 0.5rem 0.75rem;
		font-weight: 400;
	}

	.menu-heading {
		padding: 0.375rem 0.75rem 0.125rem;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.025em;
		text-transform: uppercase;
		color: var(--color-gray-500);
	}

	/* Animate paint only: focus and dismissal remain immediate, with no lingering menu. */
	@media (prefers-reduced-motion: no-preference) {
		button {
			transition:
				background-color 140ms ease-out,
				color 140ms ease-out,
				box-shadow 140ms ease-out,
				opacity 140ms ease-out,
				transform 100ms ease-out;
		}

		button:active:not(:disabled) {
			transform: translateY(1px);
		}

		.disclosure-chevron {
			transition: transform 160ms ease-out;
		}

		#header-more-menu {
			animation: menu-reveal 160ms ease-out;
		}
	}

	@keyframes menu-reveal {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		button {
			transition: none;
		}
	}
</style>
