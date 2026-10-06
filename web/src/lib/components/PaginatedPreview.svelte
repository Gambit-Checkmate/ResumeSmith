<script lang="ts">
	import { untrack } from 'svelte';
	import type { CompiledPreview } from '$lib/pdf-compiler';
	import {
		BASE_PREVIEW_WIDTH,
		MAX_PREVIEW_ZOOM,
		MIN_PREVIEW_ZOOM,
		previewWidth,
		stepPreviewZoom,
		type PreviewZoom,
	} from '$lib/preview-zoom';

	// The page is bindable because the preview remounts on every recompile; the parent keeps the reader's place.
	let {
		preview,
		documentLabel,
		pageIndex = $bindable(0),
		zoom = $bindable<PreviewZoom>('page'),
	}: { preview: CompiledPreview; documentLabel: string; pageIndex?: number; zoom?: PreviewZoom } = $props();
	let pageSvgs = $state<string[]>([]);
	let availableWidth = $state(BASE_PREVIEW_WIDTH);
	let availableHeight = $state(Infinity);
	let scroller = $state<HTMLElement>();
	let currentPage = $derived(preview.pages[pageIndex] ?? preview.pages[0]);
	let pageWidth = $derived(previewWidth(availableWidth, zoom, availableHeight, currentPage.width / currentPage.height));
	let effectiveZoom = $derived((pageWidth / BASE_PREVIEW_WIDTH) * 100);

	$effect(() => {
		if (!scroller) return;
		const observer = new ResizeObserver(([entry]) => {
			availableWidth = entry.contentRect.width;
			availableHeight = entry.contentRect.height;
		});
		observer.observe(scroller);
		return () => observer.disconnect();
	});

	function splitPages({ svg, pages }: CompiledPreview): string[] {
		if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return [];

		// The renderer's inline script contains HTML entities such as &nbsp;, which
		// are valid in the browser but not in a standalone XML document.
		const document = new DOMParser().parseFromString(svg, 'text/html');
		const root = document.querySelector('svg');
		if (!root) return [];
		const renderedPages = Array.from(root.children).filter((child) => child.classList.contains('typst-page'));
		if (renderedPages.length !== pages.length) return [];

		const shared = Array.from(root.children).filter(
			(child) => !child.classList.contains('typst-page') && child.tagName.toLowerCase() !== 'script',
		);
		const serializer = new XMLSerializer();

		return renderedPages.map((renderedPage, index) => {
			const page = pages[index];
			const pageRoot = root.cloneNode(false) as SVGSVGElement;
			pageRoot.setAttribute('viewBox', `0 0 ${page.width} ${page.height}`);
			pageRoot.setAttribute('width', String(page.width));
			pageRoot.setAttribute('height', String(page.height));
			pageRoot.setAttribute('data-width', String(page.width));
			pageRoot.setAttribute('data-height', String(page.height));

			for (const node of shared) pageRoot.appendChild(node.cloneNode(true));
			const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			background.setAttribute('width', String(page.width));
			background.setAttribute('height', String(page.height));
			background.setAttribute('fill', 'white');
			pageRoot.appendChild(background);
			const pageContent = renderedPage.cloneNode(true) as SVGElement;
			const transform = renderedPage.getAttribute('transform') ?? '';
			const horizontalOffset = transform.match(/translate\(\s*([^,\s)]+)/)?.[1] ?? '0';
			pageContent.setAttribute('transform', `translate(${horizontalOffset}, 0)`);
			pageRoot.appendChild(pageContent);

			return serializer.serializeToString(pageRoot);
		});
	}

	$effect(() => {
		const pages = splitPages(preview);
		pageSvgs = pages;
		const lastPage = Math.max(pages.length - 1, 0);
		if (untrack(() => pageIndex) > lastPage) pageIndex = lastPage;
	});
</script>

<div
	class="flex h-full min-h-0 w-full flex-col items-center gap-3"
	aria-label={`${preview.pages.length}-page ${documentLabel} preview`}
>
	<div class="flex w-full flex-wrap items-center justify-center gap-2" role="group" aria-label="Preview zoom">
		<button
			class="secondary px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
			aria-label="Zoom out preview"
			disabled={effectiveZoom <= MIN_PREVIEW_ZOOM}
			onclick={() => (zoom = stepPreviewZoom(effectiveZoom, -1))}>−</button
		>
		<span
			class="min-w-12 text-center text-sm font-medium text-white"
			aria-live={typeof zoom === 'number' ? 'polite' : 'off'}
			>{typeof zoom === 'number'
				? `${zoom}%`
				: `${zoom === 'page' ? 'Page' : 'Width'} · ${Math.round(effectiveZoom)}%`}</span
		>
		<button
			class="secondary px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
			aria-label="Zoom in preview"
			disabled={effectiveZoom >= MAX_PREVIEW_ZOOM}
			onclick={() => (zoom = stepPreviewZoom(effectiveZoom, 1))}>+</button
		>
		<button
			class="secondary px-3 py-1 text-sm"
			aria-label="Fit preview to width"
			aria-pressed={zoom === null}
			onclick={() => (zoom = null)}>Fit width</button
		>
		<button
			class="secondary px-2 py-1 text-sm"
			aria-label="Fit whole preview page"
			aria-pressed={zoom === 'page'}
			onclick={() => (zoom = 'page')}>Fit page</button
		>
		{#if pageSvgs.length > 1 && pageSvgs.length === preview.pages.length}
			<nav class="flex items-center gap-2" aria-label="Preview pages">
				<button
					class="secondary px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => (pageIndex -= 1)}
					disabled={pageIndex === 0}
					aria-label="Previous preview page">←</button
				>
				<span class="text-sm font-medium text-white" aria-live="polite">{pageIndex + 1} / {pageSvgs.length}</span>
				<button
					class="secondary px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => (pageIndex += 1)}
					disabled={pageIndex === pageSvgs.length - 1}
					aria-label="Next preview page">→</button
				>
			</nav>
		{/if}
	</div>
	<div
		bind:this={scroller}
		class="min-h-0 w-full flex-1 overflow-auto"
		role="region"
		aria-label={`${documentLabel} page ${pageIndex + 1}`}
	>
		<div class="resume-page mx-auto" style:width={`${pageWidth}px`}>
			{#if pageSvgs.length > 0 && pageSvgs.length === preview.pages.length}
				{@html pageSvgs[pageIndex]}
			{:else}
				{@html preview.svg}
			{/if}
		</div>
	</div>
</div>

<style>
	.resume-page :global(svg) {
		display: block;
		width: 100%;
		height: auto;
		margin: 0 auto;
	}
</style>
