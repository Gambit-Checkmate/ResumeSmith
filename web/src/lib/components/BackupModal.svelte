<script lang="ts">
	import { tick } from 'svelte';
	import { onetStore } from '$lib/onet-store';
	import { downloadBlob } from '$lib/browser-download';
	import { createBackup, MAX_BACKUP_BYTES, persistBackup, readBackupFile, type ResumeBackup } from '$lib/resume-backup';
	import type { ResumeData } from '$lib/types';

	let {
		open = $bindable(),
		data,
		onRestore,
	}: { open: boolean; data: ResumeData; onRestore: (backup: ResumeBackup) => void } = $props();
	let dialog = $state<HTMLDivElement>();
	let fileInput = $state<HTMLInputElement>();
	let pending = $state<ResumeBackup | null>(null);
	let error = $state('');
	let status = $state('');
	let reading = $state(false);
	let entryCount = $derived(
		pending
			? pending.resume.clearance.length +
					pending.resume.education.length +
					pending.resume.projects.length +
					pending.resume.workExperience.length +
					pending.resume.leadership.length +
					pending.resume.skills.length +
					pending.resume.achievements.length +
					pending.resume.publications.length +
					pending.resume.presentations.length +
					pending.resume.customSections.reduce((sum, section) => sum + section.entries.length, 0)
			: 0,
	);

	$effect(() => {
		if (!open) return;
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		void tick().then(() => dialog?.focus());
		return () => opener?.focus();
	});

	function close() {
		if (reading) return;
		open = false;
		pending = null;
		error = '';
		status = '';
		if (fileInput) fileInput.value = '';
	}

	function downloadCurrent() {
		error = '';
		status = '';
		try {
			const text = createBackup(data, $onetStore);
			const today = new Date().toISOString().slice(0, 10);
			downloadBlob(new Blob([text], { type: 'application/json;charset=utf-8' }), `resumesmith-backup-${today}.json`);
			status = 'Current editable data downloaded.';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not download the backup.';
		}
	}

	async function chooseFile(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		pending = null;
		error = '';
		status = '';
		if (!file) return;
		reading = true;
		try {
			pending = await readBackupFile(file);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not read the backup file.';
		} finally {
			reading = false;
		}
	}

	function restore() {
		if (!pending) return;
		error = '';
		try {
			const backup = $state.snapshot(pending);
			persistBackup(backup, window.localStorage);
			onRestore(backup);
			close();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not restore the backup.';
		}
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
				'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
			aria-labelledby="backup-title"
			tabindex="-1"
			onkeydown={onDialogKeydown}
		>
			<div class="flex items-center justify-between gap-3">
				<h2 id="backup-title" class="text-lg font-semibold">Editable backup</h2>
				<button class="secondary px-2 py-1 text-sm" onclick={close} disabled={reading}>Close</button>
			</div>
			<p class="text-sm text-gray-700">
				Backups contain personal resume information. Keep the JSON file private. Downloads and restores stay in this
				browser and do not use AI or a network request. Custom templates and CV bibliography files are not included; the
				current session template remains active after restore.
			</p>
			<button class="secondary" onclick={downloadCurrent}>Download current data</button>
			<div>
				<label for="backup-file">Restore a backup (JSON, up to {MAX_BACKUP_BYTES / (1024 * 1024)} MB)</label>
				<input
					bind:this={fileInput}
					id="backup-file"
					type="file"
					accept=".json,application/json"
					onchange={chooseFile}
					disabled={reading}
				/>
			</div>
			{#if reading}<p role="status" class="text-sm text-gray-600">Reading backup...</p>{/if}
			{#if pending}
				<div class="rounded border border-gray-300 bg-gray-50 p-3 text-sm" aria-label="Restore summary">
					<p class="font-semibold">Ready to restore</p>
					<p>Document: {pending.resume.documentType === 'cv' ? 'Academic CV' : 'Resume'}</p>
					<p>Name: {pending.resume.personalInfo.name || '(blank)'}</p>
					<p>Entries: {entryCount}; custom sections: {pending.resume.customSections.length}</p>
					<p>Selected occupation: {pending.occupation?.title ?? 'None'}</p>
				</div>
				<p class="text-sm text-gray-700">
					Restoring replaces the current resume and selected occupation. Download the current data first if you want to
					keep it.
				</p>
				<button class="danger" onclick={restore}>Restore and replace current data</button>
			{/if}
			{#if error}<p role="alert" class="text-sm text-red-700">{error}</p>{/if}
			{#if status}<p role="status" class="text-sm text-green-700">{status}</p>{/if}
		</div>
	</div>
{/if}
