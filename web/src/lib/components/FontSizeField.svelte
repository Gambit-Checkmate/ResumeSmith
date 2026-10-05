<script lang="ts">
	import { FONT_SIZE_BOUNDS, FONT_SIZE_STEP, stepFontSize } from '$lib/fonts';
	import { commitFontSizeDraft, formatFontSize, parseFontSizeDraft } from '$lib/font-size-input';
	import type { FontSettings } from '$lib/types';

	let {
		id,
		label,
		hint,
		sizeKey,
		value = $bindable(),
	}: { id: string; label: string; hint: string; sizeKey: keyof FontSettings; value: number } = $props();

	const [min, max] = $derived(FONT_SIZE_BOUNDS[sizeKey]);
	const hintId = $derived(`${id}-hint`);
	const noteId = $derived(`${id}-note`);

	// Text being typed. Null means the field mirrors the stored value, so resets and restores show up immediately.
	let draft = $state<string | null>(null);
	let note = $state('');
	let originalValue: number | undefined;

	const shown = $derived(draft ?? formatFontSize(value, sizeKey));
	const invalid = $derived(draft !== null && parseFontSizeDraft(draft, sizeKey).status !== 'valid');

	function onInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (draft === null) originalValue = value;
		draft = event.currentTarget.value;
		note = '';
		const parsed = parseFontSizeDraft(draft, sizeKey);
		// Only a complete, in-range number reaches the live preview while typing.
		if (parsed.status === 'valid' && parsed.value !== value) value = parsed.value;
	}

	function commit() {
		if (draft === null) return;
		const result = commitFontSizeDraft(draft, sizeKey, value);
		if (result.value !== value) value = result.value;
		draft = null;
		originalValue = undefined;
		if (result.outcome === 'clamped') note = `Adjusted to ${result.value} pt, the allowed range is ${min}–${max} pt.`;
		else if (result.outcome === 'restored') note = `Enter a number from ${min} to ${max}. Kept ${result.value} pt.`;
		else note = '';
	}

	function step(delta: number) {
		draft = null;
		originalValue = undefined;
		note = '';
		value = stepFontSize(value, delta, sizeKey);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commit();
		} else if (event.key === 'Escape' && draft !== null) {
			event.preventDefault();
			event.stopPropagation();
			if (originalValue !== undefined) value = originalValue;
			originalValue = undefined;
			draft = null;
			note = '';
		} else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault();
			// Settle any typed text first so the step starts from what the user sees.
			commit();
			step(event.key === 'ArrowUp' ? FONT_SIZE_STEP : -FONT_SIZE_STEP);
		}
	}
</script>

<div class="size-field">
	<div class="min-w-0">
		<label for={id}>{label}</label>
		<p id={hintId} class="text-xs text-gray-500">{hint} · {min}–{max} pt</p>
	</div>
	<div class="size-stepper" role="group" aria-label={`${label} in points`} data-invalid={invalid ? '' : undefined}>
		<button
			type="button"
			class="step-btn"
			onclick={() => step(-FONT_SIZE_STEP)}
			disabled={value <= min}
			aria-label={`Decrease ${label.toLowerCase()} by ${FONT_SIZE_STEP} pt`}>−</button
		>
		<input
			{id}
			class="size-input"
			type="text"
			inputmode="decimal"
			autocomplete="off"
			spellcheck="false"
			maxlength="6"
			value={shown}
			aria-describedby={`${hintId} ${noteId}`}
			aria-invalid={invalid ? 'true' : undefined}
			oninput={onInput}
			onblur={commit}
			onkeydown={onKeydown}
		/>
		<span class="size-unit" aria-hidden="true">pt</span>
		<button
			type="button"
			class="step-btn"
			onclick={() => step(FONT_SIZE_STEP)}
			disabled={value >= max}
			aria-label={`Increase ${label.toLowerCase()} by ${FONT_SIZE_STEP} pt`}>+</button
		>
	</div>
	<p id={noteId} class="size-note" role="status">{note}</p>
</div>

<style>
	.size-field {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.25rem 1rem;
	}

	.size-field label {
		margin-bottom: 0.125rem;
	}

	.size-note {
		flex-basis: 100%;
		font-size: 0.75rem;
		color: var(--color-gray-600);
	}

	.size-note:empty {
		display: none;
	}

	.size-stepper {
		display: inline-flex;
		align-items: stretch;
		overflow: hidden;
		border: 1px solid var(--color-gray-300);
		border-radius: 0.375rem;
		background: white;
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
	}

	.size-stepper:focus-within {
		border-color: var(--color-blue-500);
		box-shadow: 0 0 0 2px var(--color-blue-500);
	}

	.size-stepper[data-invalid] {
		border-color: var(--color-red-600);
	}

	.size-stepper[data-invalid]:focus-within {
		box-shadow: 0 0 0 2px var(--color-red-600);
	}

	.size-stepper .step-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		padding: 0;
		border-radius: 0;
		background: var(--color-gray-50);
		color: var(--color-gray-700);
		font-size: 1.125rem;
		line-height: 1;
		transition: background-color 150ms;
	}

	.size-stepper .step-btn:hover:not(:disabled) {
		background: var(--color-gray-200);
	}

	.size-stepper .step-btn:focus-visible {
		outline: 2px solid var(--color-blue-500);
		outline-offset: -2px;
	}

	.size-stepper .step-btn:disabled {
		color: var(--color-gray-300);
		cursor: not-allowed;
	}

	/* Mirrors the global input selector so these resets win on specificity. */
	.size-stepper input.size-input:not([type='checkbox']):not([type='color']):not([type='range']) {
		width: 3rem;
		padding: 0.375rem 0 0.375rem 0.25rem;
		border: 0;
		border-radius: 0;
		box-shadow: none;
		text-align: right;
		font-family: var(--font-mono);
		font-size: 0.875rem;
	}

	.size-unit {
		display: inline-flex;
		align-items: center;
		padding: 0 0.5rem 0 0.125rem;
		font-size: 0.75rem;
		color: var(--color-gray-500);
	}

	@media (prefers-reduced-motion: reduce) {
		.size-stepper .step-btn {
			transition: none;
		}
	}
</style>
