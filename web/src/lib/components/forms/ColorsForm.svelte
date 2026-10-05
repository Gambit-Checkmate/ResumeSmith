<script lang="ts">
	import type { ColorSettings, ResumeData } from '$lib/types';
	import { defaultResumeData } from '$lib/types';

	let { data }: { data: ResumeData } = $props();

	const COLORS: { key: keyof ColorSettings; label: string; hint: string; idSuffix: string }[] = [
		{ key: 'headColor', label: 'Header Color', hint: 'Your name', idSuffix: 'header-color' },
		{ key: 'textColor', label: 'Text Color', hint: 'Body text', idSuffix: 'text-color' },
		{ key: 'accentColor', label: 'Accent Color', hint: 'Section headings and rules', idSuffix: 'accent-color' },
		{ key: 'linkColor', label: 'Link Color', hint: 'Email and web links', idSuffix: 'link-color' },
	];

	function resetColorSettings() {
		data.colors = { ...defaultResumeData.colors };
	}
	const uid = $props.id();
</script>

<div class="editor-form">
	<div class="editor-heading">
		<h2>Color Settings</h2>
		<button type="button" class="editor-action" onclick={resetColorSettings}>Reset to Default</button>
	</div>
	<div class="editor-grid">
		{#each COLORS as color (color.key)}
			<div class="color-card flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
				<input
					id={`${uid}-${color.idSuffix}`}
					type="color"
					bind:value={data.colors[color.key]}
					class="color-swatch shrink-0 cursor-pointer"
					aria-describedby={`${uid}-${color.idSuffix}-hint`}
				/>
				<div class="min-w-0">
					<label for={`${uid}-${color.idSuffix}`} class="mb-0!">{color.label}</label>
					<p id={`${uid}-${color.idSuffix}-hint`} class="truncate text-xs text-gray-500">
						{color.hint} · <span class="font-mono uppercase">{data.colors[color.key]}</span>
					</p>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.color-card:focus-within {
		border-color: var(--color-blue-500);
		box-shadow: 0 0 0 1px var(--color-blue-500);
	}

	.color-swatch {
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: 1px solid var(--color-gray-300);
		border-radius: 0.5rem;
		background: none;
	}

	.color-swatch::-webkit-color-swatch-wrapper {
		padding: 2px;
	}

	.color-swatch::-webkit-color-swatch {
		border: 0;
		border-radius: 0.375rem;
	}

	.color-swatch::-moz-color-swatch {
		border: 0;
		border-radius: 0.375rem;
	}
</style>
