<script lang="ts">
	import '../app.css';
	import MobileWarning from '$lib/components/MobileWarning.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<title>ResumeSmith | Forge a job-ready resume</title>
	<meta name="application-name" content="ResumeSmith" />
	<meta
		name="description"
		content="Build, tailor, and export a polished resume with privacy-conscious AI assistance and customizable Typst templates."
	/>
	<meta property="og:title" content="ResumeSmith" />
	<meta
		property="og:description"
		content="Forge a polished, job-ready resume with live previews, AI-assisted tailoring, and Typst PDF export."
	/>
</svelte:head>

<MobileWarning />

{@render children()}
