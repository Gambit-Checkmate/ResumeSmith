<!--
	The footer stays short on desktop so the viewport-locked layout in +page.svelte keeps its height: attribution on
	the left, credits on the right. Below lg the two groups stack so nothing overflows a phone viewport.

	The O*NET badge and credit line are required attribution using the official markup: do not reword the text or
	restyle the badge.

	The badge is served from static/ rather than hotlinked from onetcenter.org.
	vercel.json sets Cross-Origin-Embedder-Policy: require-corp (the Typst WASM
	compiler needs SharedArrayBuffer), and under require-corp a cross-origin
	subresource must send Cross-Origin-Resource-Policy. O*NET's server does not,
	so the hotlinked badge is blocked in production while working fine in dev.
-->
<script lang="ts">
	// Applied through the snippet so every external link looks alike; the GitHub call to action adds one accent.
	const linkClass =
		'rounded-sm text-gray-600 underline decoration-gray-300 underline-offset-2 hover:text-gray-900 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
	const accentClass =
		'rounded-sm font-medium text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-900 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
</script>

{#snippet external(href: string, label: string, accent = false)}
	<a {href} target="_blank" rel="noopener noreferrer" class="footer-link {accent ? accentClass : linkClass}">{label}</a>
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
			class="flex flex-wrap items-baseline gap-x-4 gap-y-1 [&_a]:whitespace-nowrap border-t border-gray-100 pt-3 lg:flex-col lg:items-end lg:gap-x-0 lg:border-t-0 lg:border-l lg:border-gray-200 lg:pt-0 lg:shrink-0 lg:pl-6 lg:text-right"
		>
			<p>
				{new Date().getFullYear()} ResumeSmith -
				{@render external('https://asternberg.xyz', 'Austin Sternberg')}
				&middot;
				{@render external('https://typst.app', 'Typst')}
				Layout by
				{@render external('https://monster0506.dev/', 'TJ Raklovits')}
			</p>
			<p>Version: {__APP_VERSION__}</p>
			<p>
				Missing something?
				{@render external('https://github.com/YoyoJesus/ResumeSmith', 'Contribute on GitHub', true)}
			</p>
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
