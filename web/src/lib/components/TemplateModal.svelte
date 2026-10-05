<script lang="ts">
	import { tick } from 'svelte';
	import { generateTypstTemplate, RESUME_CONTENT_MARKER } from '$lib/typst-generator';
	import {
		customTemplateStores,
		MAX_TEMPLATE_SIZE,
		validateTemplateCompatibility,
		type CustomTemplate,
	} from '$lib/template-store';
	import type { ResumeData } from '$lib/types';
	import { DOCX_TEMPLATE_MAX_BYTES, DOCX_TEMPLATE_MAX_LABEL } from '$lib/template-limits';
	import { downloadBlob } from '$lib/browser-download';

	let {
		open = $bindable(),
		data,
		currentTemplate,
	}: {
		open: boolean;
		data: ResumeData;
		currentTemplate: CustomTemplate | null;
	} = $props();

	type Status = 'idle' | 'converting' | 'validating' | 'error';
	let status = $state<Status>('idle');
	let errorMessage = $state('');
	// Word files wait here until the user confirms sending them to AI.
	let pendingDocx = $state<File | null>(null);
	let dragOver = $state(false);
	let fileInput = $state<HTMLInputElement>();
	let dialog = $state<HTMLDivElement>();
	let isBusy = $derived(status === 'converting' || status === 'validating');
	let documentType = $derived(data.documentType);
	let documentName = $derived(documentType === 'cv' ? 'CV' : 'resume');

	$effect(() => {
		if (!open) return;
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		void tick().then(() => dialog?.focus());
		return () => opener?.focus();
	});

	function close() {
		if (isBusy) return;
		open = false;
		status = 'idle';
		errorMessage = '';
		pendingDocx = null;
		dragOver = false;
	}

	function handleFile(file: File) {
		errorMessage = '';
		pendingDocx = null;
		const lowerName = file.name.toLowerCase();
		if (lowerName.endsWith('.docx')) {
			if (file.size > DOCX_TEMPLATE_MAX_BYTES) {
				fail(`The Word file must be ${DOCX_TEMPLATE_MAX_LABEL} or smaller.`);
			} else {
				pendingDocx = file;
				status = 'idle';
			}
			return;
		}
		if (!lowerName.endsWith('.typ')) return fail('Choose a Word (.docx) or Typst (.typ) file.');
		if (file.size > MAX_TEMPLATE_SIZE) return fail('The Typst file must be 1 MB or smaller.');
		void loadTemplate(file, false);
	}

	function fail(message: string) {
		errorMessage = message;
		status = 'error';
	}

	async function loadTemplate(file: File, isDocx: boolean) {
		pendingDocx = null;
		errorMessage = '';
		try {
			let template: CustomTemplate;
			if (isDocx) {
				status = 'converting';
				const form = new FormData();
				form.append('file', file);
				const response = await fetch('/api/template/convert', { method: 'POST', body: form });
				if (!response.ok) {
					let message = "AI couldn't convert that Word template. Please try again.";
					try {
						const body = await response.json();
						if (body?.error?.message) message = body.error.message;
					} catch {
						// Keep the fallback when the platform returns a non-JSON error page.
					}
					throw new Error(message);
				}
				const body = (await response.json()) as { data: CustomTemplate };
				template = body.data;
			} else {
				template = { name: file.name, source: await file.text() };
			}

			status = 'validating';
			const contractError = await validateTemplateCompatibility(template.source, documentType);
			if (contractError) throw new Error(contractError);

			// Nothing is cached until a fully populated fixture has exercised every helper.
			customTemplateStores[documentType].save(template);
			status = 'idle';
			close();
		} catch (error) {
			fail(error instanceof Error ? error.message : 'The template could not be loaded.');
		}
	}

	function onPick(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) handleFile(file);
		target.value = '';
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) handleFile(file);
	}

	function useDefaultTemplate() {
		customTemplateStores[documentType].clear();
		close();
	}

	function downloadStarterTemplate() {
		const blob = new Blob([generateTypstTemplate(data)], { type: 'text/plain;charset=utf-8' });
		downloadBlob(blob, `${documentType === 'cv' ? 'cv' : 'resume'}-template.typ`);
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
				'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])',
			),
		).filter((element) => !element.hasAttribute('hidden'));
		if (focusable.length === 0) {
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
			class="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="template-dialog-title"
			tabindex="-1"
			onkeydown={onDialogKeydown}
		>
			<div class="flex items-center justify-between gap-3">
				<h2 id="template-dialog-title" class="text-lg font-semibold">
					{documentType === 'cv' ? 'CV template' : 'Resume template'}
				</h2>
				<button class="secondary px-2 py-1 text-sm" onclick={close} disabled={isBusy}>Close</button>
			</div>

			<div class="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm">
				<span class="min-w-0 truncate">
					<span class="text-gray-500">Current:</span>
					<span class="font-medium">{currentTemplate ? currentTemplate.name : 'Built-in template'}</span>
				</span>
				{#if currentTemplate}
					<button
						class="secondary shrink-0 px-2 py-1 text-xs"
						type="button"
						onclick={useDefaultTemplate}
						disabled={isBusy}>Switch to built-in</button
					>
				{/if}
			</div>

			{#if pendingDocx}
				<div class="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
					<p class="font-medium break-words">{pendingDocx.name}</p>
					<p>This Word file is sent to AI for conversion. Images and some styling may not carry over.</p>
					<div class="flex justify-end gap-2">
						<button class="secondary" type="button" onclick={() => (pendingDocx = null)}>Cancel</button>
						<button class="primary" type="button" onclick={() => pendingDocx && loadTemplate(pendingDocx, true)}
							>Convert with AI</button
						>
					</div>
				</div>
			{:else}
				<button
					type="button"
					disabled={isBusy}
					class="w-full rounded-lg border-2 border-dashed p-7 text-center transition-colors disabled:cursor-wait {dragOver
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
					{#if status === 'converting'}
						<span class="text-gray-700">Converting with AI...</span>
					{:else if status === 'validating'}
						<span class="text-gray-700">Checking template...</span>
					{:else}
						<span class="text-gray-600">Upload a Word or Typst template</span>
						<span class="mt-1 block text-xs text-gray-400"
							>.docx up to {DOCX_TEMPLATE_MAX_LABEL} or .typ up to 1 MB. Saved until you close this tab.</span
						>
					{/if}
				</button>
			{/if}
			<input
				bind:this={fileInput}
				type="file"
				accept=".typ,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
				class="hidden"
				onchange={onPick}
			/>

			{#if status === 'error'}
				<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					<p class="font-medium">Template upload failed</p>
					<p class="mt-1 break-words">{errorMessage}</p>
				</div>
			{/if}

			<details class="text-sm text-gray-700">
				<summary class="cursor-pointer text-gray-600 hover:text-gray-900">Making your own Typst template</summary>
				<div class="mt-2 space-y-2 rounded-md border border-gray-200 p-3">
					<p>Keep the starter file's helper functions and this line:</p>
					<code class="block overflow-x-auto rounded bg-gray-100 px-2 py-1 text-xs">{RESUME_CONTENT_MARKER}</code>
					<p class="text-xs text-gray-500">Everything below that line is replaced with your {documentName}.</p>
					<button class="secondary text-xs" type="button" onclick={downloadStarterTemplate}
						>Download starter file</button
					>
				</div>
			</details>
		</div>
	</div>
{/if}
