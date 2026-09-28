<script lang="ts">
	let {
		showCode = $bindable(),
		isCompiling,
		compileError,
		compiledPageCount,
		estimatedOverOnePage,
		onDownload,
		onDownloadTypst,
		onUpload,
		onTemplate,
		onTailor,
		hasCustomTemplate,
	}: {
		showCode: boolean;
		isCompiling: boolean;
		compileError: string | null;
		compiledPageCount: number | null;
		estimatedOverOnePage: boolean;
		onDownload: () => void;
		onDownloadTypst: () => void;
		onUpload: () => void;
		onTemplate: () => void;
		onTailor: () => void;
		hasCustomTemplate: boolean;
	} = $props();
</script>

<header class="bg-white shadow-sm">
	<div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between flex-wrap gap-2">
			<h1 class="text-2xl font-bold text-gray-900">ResumeSmith</h1>
			<div class="flex gap-2">
				<button class="secondary" onclick={onUpload} title="Fill the form from an existing resume">Import resume</button
				>
				<button class="secondary" onclick={onTemplate} title="Change the resume layout">
					{hasCustomTemplate ? 'Template: custom' : 'Template'}
				</button>
				<button class="secondary" onclick={onTailor} title="Match your resume to a job">Tailor to job</button>
				<button class="secondary" onclick={() => (showCode = !showCode)}>
					{showCode ? 'Show preview' : 'Show code'}
				</button>
				<button
					class="secondary"
					onclick={onDownloadTypst}
					title="Download the Typst source, or the empty template if the resume has no content yet"
					>Download Typst</button
				>
				<button class="primary" onclick={onDownload} disabled={isCompiling}>
					{isCompiling ? 'Generating...' : 'Download PDF'}
				</button>
			</div>
		</div>
		{#if compileError}
			<div class="mt-2 text-red-600 text-sm">{compileError}</div>
		{/if}
		{#if compiledPageCount !== null && compiledPageCount > 1}
			<div class="mt-2 px-3 py-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded text-sm">
				Your resume is {compiledPageCount} pages.
			</div>
		{:else if compiledPageCount === null && estimatedOverOnePage}
			<div class="mt-2 px-3 py-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded text-sm">
				Your resume may be over one page.
			</div>
		{/if}
	</div>
</header>
