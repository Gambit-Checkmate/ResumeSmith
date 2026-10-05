<!--
	The footer stays short on desktop so the viewport-locked layout in +page.svelte keeps its height: attribution on
	the left, a centered credits block on the right. Below lg the two groups stack so nothing overflows a phone viewport.

	The O*NET badge and credit line are required attribution using the official markup: do not reword the text or
	restyle the badge.

	The badge is served from static/ rather than hotlinked from onetcenter.org.
	vercel.json sets Cross-Origin-Embedder-Policy: require-corp (the Typst WASM
	compiler needs SharedArrayBuffer), and under require-corp a cross-origin
	subresource must send Cross-Origin-Resource-Policy. O*NET's server does not,
	so the hotlinked badge is blocked in production while working fine in dev.
-->
<script lang="ts">
	// Applied through the snippet so every inline external link looks alike.
	const linkClass =
		'rounded-sm text-gray-600 underline decoration-gray-300 underline-offset-2 hover:text-gray-900 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
</script>

{#snippet external(href: string, label: string)}
	<a {href} target="_blank" rel="noopener noreferrer" class="footer-link {linkClass}">{label}</a>
{/snippet}

<footer class="bg-white border-t border-gray-200 mt-auto">
	<div
		class="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 lg:py-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-8 text-[11px] leading-snug text-gray-500"
	>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
			<a
				href="https://services.onetcenter.org/"
				target="_blank"
				rel="noopener noreferrer"
				title="This site incorporates information from O*NET Web Services. Click to learn more."
				class="shrink-0 self-start rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
			>
				<img
					src="/onet-in-it.svg"
					alt="O*NET in-it"
					width="130"
					height="60"
					loading="lazy"
					class="w-32.5 h-15 border-none"
				/>
			</a>
			<p class="max-w-2xl">
				This site incorporates information from
				{@render external('https://services.onetcenter.org/', 'O*NET Web Services')}
				by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET&reg; is a trademark of
				USDOL/ETA. O*NET Web Services Data License by U.S. Department of Labor, Employment and Training Administration is
				licensed under a
				{@render external(
					'https://creativecommons.org/licenses/by/4.0/',
					'Creative Commons Attribution 4.0 International License',
				)}.
			</p>
		</div>

		<div
			class="flex flex-col gap-1.5 border-t border-gray-100 pt-3 lg:shrink-0 lg:items-center lg:border-t-0 lg:border-l lg:border-gray-200 lg:pt-0 lg:pl-6 lg:text-center [&_a]:whitespace-nowrap"
		>
			<p class="flex flex-wrap items-center gap-x-2 gap-y-1 lg:justify-center">
				<span class="font-medium text-gray-700">&copy; {new Date().getFullYear()} ResumeSmith</span>
				<span
					class="rounded-full border border-gray-200 bg-gray-50 px-2 py-px font-mono text-[10px] leading-normal text-gray-600"
				>
					<span class="sr-only">Version:</span>
					{__APP_VERSION__}
				</span>
			</p>
			<p class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 lg:justify-center">
				<span>by {@render external('https://asternberg.xyz', 'Austin Sternberg')}</span>
				<span aria-hidden="true" class="text-gray-300">&middot;</span>
				<span>
					{@render external('https://typst.app', 'Typst')}
					Layout by
					{@render external('https://monster0506.dev/', 'TJ Raklovits')}
				</span>
			</p>
			<a
				href="https://github.com/YoyoJesus/ResumeSmith"
				target="_blank"
				rel="noopener noreferrer"
				class="footer-link inline-flex items-center gap-1.5 self-start rounded-full border border-blue-200 px-2.5 py-1 font-medium text-blue-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:self-center"
			>
				<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" fill="currentColor" class="size-3.5 shrink-0">
					<path
						fill="currentColor"
						d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
					/>
				</svg>
				Contribute on GitHub
			</a>
		</div>
	</div>
</footer>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.footer-link {
			transition:
				color 140ms ease-out,
				text-decoration-color 140ms ease-out;
		}
	}
</style>
