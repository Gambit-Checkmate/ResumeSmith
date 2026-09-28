<!--
	Single row so the footer stays short enough for the viewport-locked layout in
	+page.svelte. The O*NET badge and credit line are required attribution using
	the official markup: do not reword the text or restyle the badge.

	The badge is served from static/ rather than hotlinked from onetcenter.org.
	vercel.json sets Cross-Origin-Embedder-Policy: require-corp (the Typst WASM
	compiler needs SharedArrayBuffer), and under require-corp a cross-origin
	subresource must send Cross-Origin-Resource-Policy. O*NET's server does not,
	so the hotlinked badge is blocked in production while working fine in dev.
-->
<footer class="bg-white border-t border-gray-200 mt-auto">
	<div
		class="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[11px] leading-tight text-gray-500"
	>
		<div class="flex items-center gap-3">
			<a
				href="https://services.onetcenter.org/"
				target="_blank"
				rel="noopener noreferrer"
				title="This site incorporates information from O*NET Web Services. Click to learn more."
				class="shrink-0"
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
				<a
					href="https://services.onetcenter.org/"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-gray-700 underline">O*NET Web Services</a
				>
				by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET&reg; is a trademark of
				USDOL/ETA. O*NET Web Services Data License by U.S. Department of Labor, Employment and Training Administration is
				licensed under a
				<a
					href="https://creativecommons.org/licenses/by/4.0/"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-gray-700 underline">Creative Commons Attribution 4.0 International License</a
				>.
			</p>
		</div>

		<div class="shrink-0 space-y-1">
			<p>
				{new Date().getFullYear()} ResumeSmith -
				<a href="https://asternberg.xyz" target="_blank" rel="noopener noreferrer" class="hover:text-gray-700"
					>Austin Sternberg</a
				>
				&middot;
				<a href="https://typst.app" target="_blank" rel="noopener noreferrer" class="hover:text-gray-700">Typst</a>
				Layout by
				<a href="https://monster0506.dev/" target="_blank" rel="noopener noreferrer" class="hover:text-gray-700"
					>TJ Raklovits</a
				>
				&middot;
				<span title="Build version">{__APP_VERSION__}</span>
			</p>
			<p>
				Missing something?
				<a
					href="https://github.com/YoyoJesus/ResumeSmith"
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-blue-600 underline hover:text-blue-800">Contribute on GitHub</a
				>
			</p>
		</div>
	</div>
</footer>
