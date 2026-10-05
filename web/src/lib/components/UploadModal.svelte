<script lang="ts">
	import { tick } from 'svelte';
	import { resumeStore } from '$lib/store';
	import { buildResumeFromExtraction } from '$lib/resume-utils';
	import { setHighlightsFromData } from '$lib/ai-highlight';
	import { preflightDocument, type PreflightResult } from '$lib/document-preflight';
	import { MAX_CV_PDF_PAGES, MAX_PDF_PAGES } from '$lib/document-quality';
	import { buildResumeFromCvExtraction } from '$lib/cv-extraction';
	import { failedParts, mergedCv, runCvImport, startCvImport, type CvImportState } from '$lib/cv-import';
	import { documentTypes, documentTypeLabels, type DocumentType, type ExtractedResume } from '$lib/types';

	let {
		open = $bindable(),
		documentType,
		onApplied,
	}: { open: boolean; documentType: DocumentType; onApplied: () => void } = $props();

	type Status = 'idle' | 'analyzing' | 'review' | 'processing' | 'partial' | 'error';
	let status = $state<Status>('idle');
	let errorMessage = $state('');
	let progressMessage = $state('Checking document...');
	let dragOver = $state(false);
	let result = $state<PreflightResult | null>(null);
	let fileInput = $state<HTMLInputElement>();
	let dialog = $state<HTMLDivElement>();
	let isBusy = $derived(status === 'analyzing' || status === 'processing');
	let importType = $state<DocumentType>('resume');
	let cvImport = $state<CvImportState | null>(null);
	let noun = $derived(importType === 'cv' ? 'CV' : 'resume');

	const ACCEPT = '.pdf,.docx,.txt';
	const METHOD_LABELS: Record<PreflightResult['metrics']['method'], string> = {
		text: 'read as text',
		ocr: 'scanned with OCR',
		hybrid: 'text and OCR',
	};

	$effect(() => {
		if (!open) return;
		importType = documentType;
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		void tick().then(() => dialog?.focus());
		return () => opener?.focus();
	});

	function reset() {
		status = 'idle';
		errorMessage = '';
		progressMessage = 'Checking document...';
		dragOver = false;
		result = null;
		cvImport = null;
	}

	function close() {
		if (isBusy) return;
		open = false;
		reset();
	}

	async function handleFile(file: File) {
		status = 'analyzing';
		errorMessage = '';
		result = null;
		try {
			result = await preflightDocument(
				file,
				({ message }) => {
					progressMessage = message;
				},
				{ maxPdfPages: importType === 'cv' ? MAX_CV_PDF_PAGES : MAX_PDF_PAGES },
			);
			status = 'review';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : "Couldn't read that document.";
			status = 'error';
		}
	}

	function apply(resume: ReturnType<typeof buildResumeFromExtraction>) {
		resumeStore.set(resume);
		setHighlightsFromData(resume);
		onApplied();
		status = 'review';
		close();
	}

	// A CV goes up in bounded parts; parts that fail are kept as gaps the user can retry.
	async function importCv() {
		if (!result) return;
		status = 'processing';
		errorMessage = '';
		try {
			const state = cvImport ?? startCvImport(result.text);
			progressMessage = 'Structuring your CV with AI...';
			cvImport = await runCvImport(
				state,
				{ filename: result.filename, metrics: result.metrics },
				{
					fetch: (...args) => fetch(...args),
					wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
					onProgress: (message) => (progressMessage = message),
				},
			);
			const merged = mergedCv(cvImport);
			if (failedParts(cvImport).length === 0 && merged) return apply(buildResumeFromCvExtraction(merged));
			if (merged) {
				status = 'partial';
				return;
			}
			errorMessage = cvImport.errors.find(Boolean) ?? "Can't reach the AI service. Check your connection and retry.";
			cvImport = null;
			status = 'error';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : "Couldn't import that CV.";
			status = 'error';
		}
	}

	function useExtractedParts() {
		const merged = cvImport && mergedCv(cvImport);
		if (merged) apply(buildResumeFromCvExtraction(merged));
	}

	async function sendToAI() {
		if (!result || status !== 'review' || result.metrics.status === 'fail') return;
		if (importType === 'cv') return importCv();
		status = 'processing';
		errorMessage = '';
		try {
			const response = await fetch('/api/extract', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ filename: result.filename, text: result.text, metrics: result.metrics }),
			});

			if (!response.ok) {
				let message = "Can't reach the AI service. Check your connection and retry.";
				try {
					const body = await response.json();
					if (body?.error?.message) message = body.error.message;
				} catch {
					// Keep the fallback when the platform returns a non-JSON error page.
				}
				throw new Error(message);
			}

			const body = (await response.json()) as { data: ExtractedResume };
			apply(buildResumeFromExtraction(body.data));
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : "Can't reach the AI service. Check your connection and retry.";
			status = 'error';
		}
	}

	function onPick(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) void handleFile(file);
		target.value = '';
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) void handleFile(file);
	}

	function onDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
			return;
		}
		if (event.key !== 'Tab' || !dialog) return;
		const focusable = Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
			),
		);
		if (!focusable.length) {
			event.preventDefault();
			dialog.focus();
			return;
		}
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function percent(value: number): string {
		return `${Math.round(value * 100)}%`;
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) close();
		}}
	>
		<div
			bind:this={dialog}
			class="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="resume-upload-title"
			tabindex="-1"
			onkeydown={onDialogKeydown}
		>
			<div class="flex items-center justify-between gap-3">
				<h2 id="resume-upload-title" class="text-lg font-semibold">Import {noun}</h2>
				<button class="secondary px-2 py-1 text-sm" onclick={close} disabled={isBusy}>Close</button>
			</div>

			{#if status === 'idle'}
				<div class="flex rounded-md bg-gray-200 p-0.5 w-fit" role="group" aria-label="Import as">
					{#each documentTypes as type}
						<button
							type="button"
							class="px-3 py-1 text-sm {importType === type
								? 'bg-white text-gray-900 shadow-sm'
								: 'text-gray-600 hover:text-gray-900'}"
							aria-pressed={importType === type}
							onclick={() => (importType = type)}>{documentTypeLabels[type]}</button
						>
					{/each}
				</div>
				<p class="text-sm text-gray-600">Text is read in your browser. Review it before sending it to AI.</p>
				{#if importType === 'cv'}
					<p class="text-xs text-gray-500">
						Long CVs are sent in parts, one after another. A 20-page CV can take a few minutes.
					</p>
				{/if}
				<button
					type="button"
					class="w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
						? 'border-purple-500 bg-purple-50'
						: 'border-gray-300 hover:border-gray-400'}"
					ondragover={(event) => {
						event.preventDefault();
						dragOver = true;
					}}
					ondragleave={() => (dragOver = false)}
					ondrop={onDrop}
					onclick={() => fileInput?.click()}
				>
					<span class="text-gray-600">Drag a file here, or click to browse</span>
					<span class="mt-1 block text-xs text-gray-400"
						>PDF, DOCX, or TXT. Max 5 MB and {importType === 'cv' ? MAX_CV_PDF_PAGES : MAX_PDF_PAGES} PDF pages</span
					>
				</button>
				<input bind:this={fileInput} type="file" accept={ACCEPT} class="hidden" onchange={onPick} />
			{:else if status === 'analyzing' || status === 'processing'}
				<div class="flex flex-col items-center gap-3 py-8" aria-live="polite">
					<div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600"></div>
					<p class="text-sm text-gray-600">
						{status === 'processing' && importType === 'resume'
							? 'Structuring your resume with AI...'
							: progressMessage}
					</p>
					{#if status === 'analyzing'}
						<p class="text-center text-xs text-gray-400">OCR can take a minute on scanned PDFs.</p>
					{/if}
				</div>
			{:else if status === 'review' && result}
				<div class="space-y-3">
					<div
						class="rounded-md border px-3 py-2 {result.metrics.status === 'pass'
							? 'border-green-200 bg-green-50 text-green-900'
							: result.metrics.status === 'warning'
								? 'border-yellow-300 bg-yellow-50 text-yellow-900'
								: 'border-red-200 bg-red-50 text-red-900'}"
					>
						<p class="text-sm font-medium">
							{result.metrics.status === 'pass'
								? `We could read your ${noun}.`
								: result.metrics.status === 'warning'
									? 'Some text may be missing. Check the preview.'
									: "We couldn't read enough text. Try another file."}
						</p>
						{#if result.metrics.warnings.length}
							<ul class="mt-1 list-disc space-y-0.5 pl-5 text-xs">
								{#each result.metrics.warnings as warning}
									<li>{warning}</li>
								{/each}
							</ul>
						{/if}
						<p class="mt-1 text-xs opacity-80">
							{result.metrics.wordCount} words &middot; {result.metrics.pageCount}
							{result.metrics.pageCount === 1 ? 'page' : 'pages'} &middot; {METHOD_LABELS[result.metrics.method]} &middot;
							{percent(result.metrics.alphanumericRatio)} text quality &middot; score {result.metrics.score}/100
							{#if result.metrics.ocrPages > 0}
								&middot; OCR on {result.metrics.ocrPages}
								{result.metrics.ocrPages === 1 ? 'page' : 'pages'}, {Math.round(
									result.metrics.ocrAverageConfidence ?? 0,
								)}% confidence
							{/if}
						</p>
					</div>

					<div>
						<p class="mb-1 text-xs font-medium text-gray-600">Extracted-text preview (first 900 characters)</p>
						<pre
							class="max-h-32 overflow-auto whitespace-pre-wrap rounded border bg-gray-50 p-3 text-xs">{result.preview}</pre>
					</div>

					<p id="upload-ai-consent" class="text-sm text-gray-700">
						Send to AI shares the full extracted text to fill in your {noun}. The preview shows the first 900
						characters. Your original file stays on your device.
					</p>

					<div class="flex justify-between gap-2">
						<button class="secondary" type="button" onclick={reset}>Back</button>
						<button
							class="primary"
							type="button"
							aria-describedby="upload-ai-consent"
							onclick={sendToAI}
							disabled={result.metrics.status === 'fail'}>Send to AI and fill in my {noun}</button
						>
					</div>
				</div>
			{:else if status === 'partial' && cvImport}
				{@const failed = failedParts(cvImport)}
				<div class="space-y-3" role="status">
					<div class="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
						<p class="font-medium">
							{cvImport.chunks.length - failed.length} of {cvImport.chunks.length} parts of your CV were structured.
						</p>
						<p class="mt-1 text-xs">
							{failed.length === 1 ? 'Part' : 'Parts'}
							{failed.join(', ')}
							failed: {cvImport.errors.find(Boolean)}
						</p>
					</div>
					<p class="text-xs text-gray-600">
						Retry only the failed parts, or use what was structured and fill in the rest yourself.
					</p>
					<div class="flex justify-between gap-2">
						<button class="secondary" type="button" onclick={useExtractedParts}>Use extracted parts</button>
						<button class="primary" type="button" onclick={importCv}>Retry failed parts</button>
					</div>
				</div>
			{:else}
				<div class="flex flex-col items-center gap-3 py-6 text-center">
					<div class="text-3xl text-red-600">!</div>
					<p class="text-sm font-medium text-gray-800">Upload failed</p>
					<p class="text-sm text-gray-600">{errorMessage}</p>
					<div class="flex gap-2 pt-2">
						<button class="secondary" onclick={close}>Close</button>
						<button class="primary" onclick={reset}>Try another file</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
