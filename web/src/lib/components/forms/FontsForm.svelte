<script lang="ts">
	import type { FontSettings, ResumeData } from '$lib/types';
	import { defaultFontFamilies, defaultFontSettings } from '$lib/types';
	import { DEFAULT_FONT_FAMILY, FONT_OPTIONS } from '$lib/fonts';
	import FontSizeField from '$lib/components/FontSizeField.svelte';

	let { data }: { data: ResumeData } = $props();

	const SIZES: { key: keyof FontSettings; label: string; hint: string }[] = [
		{ key: 'baseSize', label: 'Base Text Size', hint: 'Body text, bullet points' },
		{ key: 'nameSize', label: 'Name Size', hint: 'Your name at the top' },
		{ key: 'headingSize', label: 'Section Heading Size', hint: 'Education, Experience, etc.' },
		{ key: 'contactSize', label: 'Contact Info Size', hint: 'Email, phone, links' },
	];

	function resetFontSettings() {
		data.fonts = { ...defaultFontSettings };
		data.fontFamilies = { ...defaultFontFamilies };
	}
</script>

<div class="editor-form">
	<div class="editor-heading">
		<h2>Font Settings</h2>
		<button type="button" class="editor-action" onclick={resetFontSettings}>Reset to Default</button>
	</div>

	<section class="editor-section" aria-labelledby="font-typefaces-title">
		<h3 id="font-typefaces-title" class="editor-subheading">Typefaces</h3>
		<div class="editor-grid">
			<div>
				<label for="heading-font">Heading Font</label>
				<select id="heading-font" bind:value={data.fontFamilies.heading}>
					{#each FONT_OPTIONS as option (option.family)}
						<option value={option.family}
							>{option.family}{option.family === DEFAULT_FONT_FAMILY ? ' (default)' : ''}</option
						>
					{/each}
				</select>
				<p class="mt-1 text-xs text-gray-500">Your name and section headings</p>
			</div>
			<div>
				<label for="body-font">Body Font</label>
				<select id="body-font" bind:value={data.fontFamilies.body}>
					{#each FONT_OPTIONS as option (option.family)}
						<option value={option.family}
							>{option.family}{option.family === DEFAULT_FONT_FAMILY ? ' (default)' : ''}</option
						>
					{/each}
				</select>
				<p class="mt-1 text-xs text-gray-500">Entries, bullets, and contact info</p>
			</div>
		</div>
	</section>

	<section class="editor-section" aria-labelledby="font-sizes-title">
		<div>
			<h3 id="font-sizes-title" class="editor-subheading">Sizes</h3>
			<p class="editor-description mt-1">
				Enter a size in points or use the arrow keys, −, and + to change it by 0.5 pt.
			</p>
		</div>
		<div class="divide-y divide-gray-200">
			{#each SIZES as size (size.key)}
				<div class="py-3 first:pt-0 last:pb-0">
					<FontSizeField
						id={`font-${size.key}`}
						label={size.label}
						hint={size.hint}
						sizeKey={size.key}
						bind:value={data.fonts[size.key]}
					/>
				</div>
			{/each}
		</div>
	</section>

	<p class="text-xs text-gray-500">Custom templates keep their own fonts.</p>
</div>
