<script lang="ts">
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
</script>

<header class="bg-white shadow-sm">
	<div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between flex-wrap gap-2">
			<div class="flex items-center gap-4">
				<h1 class="text-2xl font-bold text-gray-900">ResumeSmith</h1>
				<div class="flex rounded-md bg-gray-200 p-0.5" role="group" aria-label="Document type">
					{#each documentTypes as type}
						<button
							class="px-3 py-1 text-sm {documentType === type
								? 'bg-white text-gray-900 shadow-sm'
								: 'text-gray-600 hover:text-gray-900'}"
							aria-pressed={documentType === type}
							onclick={() => onDocumentTypeChange(type)}>{documentTypeLabels[type]}</button
						>
					{/each}
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<button class="secondary" onclick={onBackup} title="Download or restore editable resume data"
					>Backup / restore</button
				>
				<button class="secondary" onclick={onUpload} title="Fill the form from an existing resume or CV"
					>{documentType === 'cv' ? 'Import CV' : 'Import resume'}</button
				>
				<button class="secondary" onclick={onTemplate} title="Change the resume layout">
					{hasCustomTemplate ? 'Template: custom' : 'Template'}
				</button>
				{#if documentType === 'resume'}
					<button class="secondary" onclick={onTailor} title="Match your resume to a job">Tailor to job</button>
				{/if}
				<button class="secondary" onclick={() => (showCode = !showCode)}>
					{showCode ? 'Show preview' : 'Show code'}
				</button>
				<button
					class="secondary"
					onclick={onDownloadTypst}
					title="Download the Typst source, or the empty template if the resume has no content yet"
					>Download Typst</button
				>
				<button class="secondary" onclick={onCopyText} title="Copy readable resume text for application forms"
					>Copy resume text</button
				>
				<button class="secondary" onclick={onDownloadText} title="Download readable resume text for application forms"
					>Download .txt</button
				>
				<button class="primary" onclick={onDownload} disabled={isCompiling}>
					{isCompiling ? 'Generating...' : 'Download PDF'}
				</button>
			</div>
		</div>
		{#if compileError}
			<div class="mt-2 text-red-600 text-sm">{compileError}</div>
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
