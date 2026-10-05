<script lang="ts">
	import { tick } from 'svelte';

	let { open = $bindable(), onConfirm }: { open: boolean; onConfirm: () => string | null } = $props();
	let dialog = $state<HTMLDivElement>();
	let error = $state('');

	$effect(() => {
		if (!open) return;
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		void tick().then(() => dialog?.focus());
		return () => opener?.focus();
	});

	function close() {
		open = false;
		error = '';
	}

	function clear() {
		error = onConfirm() ?? '';
		if (!error) close();
	}

	function onDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
			return;
		}
		if (event.key !== 'Tab' || !dialog) return;
		const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled])'));
		const first = focusable[0];
		const last = focusable.at(-1);
		if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
			event.preventDefault();
			last?.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first?.focus();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) close();
		}}
	>
		<div
			bind:this={dialog}
			class="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="clear-data-title"
			aria-describedby="clear-data-description"
			tabindex="-1"
			onkeydown={onDialogKeydown}
		>
			<h2 id="clear-data-title" class="text-lg font-semibold">Delete saved data?</h2>
			<div id="clear-data-description" class="space-y-2 text-sm text-gray-700">
				<p>This permanently deletes data saved in this browser:</p>
				<ul class="list-disc space-y-1 pl-5">
					<li>resume and CV data</li>
					<li>saved occupation</li>
					<li>CV bibliography</li>
					<li>session custom templates for resumes and CVs</li>
				</ul>
				<p>Download a backup first if you may want to restore your resume and occupation.</p>
			</div>
			{#if error}<p role="alert" class="text-sm text-red-700">{error}</p>{/if}
			<div class="flex justify-end gap-2">
				<button class="secondary" type="button" onclick={close}>Cancel</button>
				<button class="danger" type="button" onclick={clear}>Delete saved data</button>
			</div>
		</div>
	</div>
{/if}
