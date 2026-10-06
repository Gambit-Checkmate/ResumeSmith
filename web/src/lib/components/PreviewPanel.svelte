<script lang="ts">
	import type { CompiledPreview } from '$lib/pdf-compiler';
	import PaginatedPreview from './PaginatedPreview.svelte';
	import type { PreviewZoom } from '$lib/preview-zoom';

	let {
		showCode,
		typstCode,
		preview,
		isPreviewLoading,
		documentLabel,
	}: {
		showCode: boolean;
		typstCode: string;
		preview: CompiledPreview | null;
		isPreviewLoading: boolean;
		documentLabel: string;
	} = $props();

	let copied = $state(false);
	let pageIndex = $state(0);
	let zoom = $state<PreviewZoom>('page');
	let copiedTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyToClipboard() {
		await navigator.clipboard.writeText(typstCode);
		copied = true;
		clearTimeout(copiedTimer);
		copiedTimer = setTimeout(() => (copied = false), 1500);
	}
</script>

<div
	class="flex h-[calc(100vh-10rem)] flex-col items-center overflow-hidden rounded-lg bg-gray-500 p-4 shadow lg:h-full"
>
	<h2 class="text-lg font-semibold mb-4 text-white">
		{showCode
			? 'Typst Code'
			: `${documentLabel} Preview${preview ? ` · ${preview.pages.length} ${preview.pages.length === 1 ? 'page' : 'pages'}` : ''}`}
	</h2>

	{#if showCode}
		<div class="relative min-h-0 w-full flex-1">
			<button class="absolute top-2 right-2 secondary text-xs" onclick={copyToClipboard}
				>{copied ? 'Copied' : 'Copy'}</button
			>
			<pre class="h-full w-full overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100"><code>{typstCode}</code
				></pre>
		</div>
	{:else}
		<div class="flex min-h-0 w-full flex-1 justify-center">
			{#if isPreviewLoading && !preview}
				<div class="flex items-center justify-center h-full text-gray-400">
					<span>Compiling preview...</span>
				</div>
			{:else if preview}
				<PaginatedPreview {preview} {documentLabel} bind:pageIndex bind:zoom />
			{:else}
				<div class="flex items-center justify-center h-full text-gray-400">
					<span>Preview will appear here</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
