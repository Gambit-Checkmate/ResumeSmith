<script lang="ts">
	import { onMount } from 'svelte';
	import { resumeStore } from '$lib/store';
	import { onetStore } from '$lib/onet-store';
	import { generateTypstCode, typstDownload } from '$lib/typst-generator';
	import { downloadBlob } from '$lib/browser-download';
	import {
		initCompiler,
		compileToPdf,
		compileToPreview,
		downloadPdf,
		setDocumentFonts,
		type CompiledPreview,
	} from '$lib/pdf-compiler';
	import type { ResumeData } from '$lib/types';
	import { defaultResumeData } from '$lib/types';
	import { estimateOverOnePage, withDocumentType } from '$lib/resume-utils';
	import { customTemplateStore, type CustomTemplate } from '$lib/template-store';
	import { createPreviewScheduler } from '$lib/preview-scheduler';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import UploadModal from '$lib/components/UploadModal.svelte';
	import TemplateModal from '$lib/components/TemplateModal.svelte';
	import OnetDrawer from '$lib/components/OnetDrawer.svelte';
	import AppFooter from '$lib/components/AppFooter.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import PreviewPanel from '$lib/components/PreviewPanel.svelte';
	import PersonalForm from '$lib/components/forms/PersonalForm.svelte';
	import ProfileForm from '$lib/components/forms/ProfileForm.svelte';
	import ClearanceForm from '$lib/components/forms/ClearanceForm.svelte';
	import EducationForm from '$lib/components/forms/EducationForm.svelte';
	import ProjectsForm from '$lib/components/forms/ProjectsForm.svelte';
	import ExperienceForm from '$lib/components/forms/ExperienceForm.svelte';
	import LeadershipForm from '$lib/components/forms/LeadershipForm.svelte';
	import SkillsForm from '$lib/components/forms/SkillsForm.svelte';
	import AchievementsForm from '$lib/components/forms/AchievementsForm.svelte';
	import PublicationsForm from '$lib/components/forms/PublicationsForm.svelte';
	import CustomSectionsForm from '$lib/components/forms/CustomSectionsForm.svelte';
	import LayoutForm from '$lib/components/forms/LayoutForm.svelte';
	import FontsForm from '$lib/components/forms/FontsForm.svelte';
	import ColorsForm from '$lib/components/forms/ColorsForm.svelte';

	let data: ResumeData = $state(structuredClone(defaultResumeData));
	let activeTab = $state('personal');
	let showCode = $state(false);
	let isCompiling = $state(false);
	let compileError = $state<string | null>(null);
	let customTemplate = $state<CustomTemplate | null>(null);
	let typstCode = $derived(generateTypstCode(data, customTemplate?.source));
	let preview = $state<CompiledPreview | null>(null);
	let isPreviewLoading = $state(false);
	let uploadOpen = $state(false);
	let templateOpen = $state(false);
	let tailorOpen = $state(false);
	let showReviewBanner = $state(false);
	let estimatedOverOnePage = $derived(data.documentType === 'resume' && estimateOverOnePage(data));
	let compiledPageCount = $derived(preview?.pages.length ?? null);

	const previewScheduler = createPreviewScheduler(compileToPreview, {
		onInvalidate: () => {
			preview = null;
			isPreviewLoading = true;
		},
		onResult: (compiled) => (preview = compiled),
		onError: (error) => console.error('SVG preview failed:', error),
		onSettled: () => (isPreviewLoading = false),
	});

	$effect(() => {
		// Custom templates set their own fonts, so only the built-in template needs web fonts.
		setDocumentFonts(customTemplate ? [] : [data.fontFamilies.heading, data.fontFamilies.body]);
		previewScheduler.schedule(typstCode);
	});

	onMount(() => {
		resumeStore.loadFromStorage();
		onetStore.loadFromStorage();
		customTemplateStore.loadFromStorage();
		const unsub = resumeStore.subscribe((val) => {
			data = val;
		});
		const unsubTemplate = customTemplateStore.subscribe((value) => {
			customTemplate = value;
		});
		initCompiler().catch(console.error);
		return () => {
			previewScheduler.dispose();
			unsub();
			unsubTemplate();
		};
	});

	$effect(() => {
		resumeStore.set(data);
		resumeStore.saveToStorage(data);
	});

	async function downloadPdfFile() {
		isCompiling = true;
		compileError = null;
		try {
			const pdfData = await compileToPdf(typstCode);
			downloadPdf(pdfData, `${data.personalInfo.name || 'resume'}.pdf`);
		} catch (err) {
			console.error('PDF compilation failed:', err);
			compileError = err instanceof Error ? err.message : 'Compilation failed';
		} finally {
			isCompiling = false;
		}
	}

	function downloadTypstFile() {
		const { source, filename } = typstDownload(data, customTemplate?.source);
		downloadBlob(new Blob([source], { type: 'text/plain;charset=utf-8' }), filename);
	}

	const tabs = [
		{ id: 'personal', label: 'Personal' },
		{ id: 'profile', label: 'Profile' },
		{ id: 'clearance', label: 'Clearance' },
		{ id: 'education', label: 'Education' },
		{ id: 'projects', label: 'Projects' },
		{ id: 'experience', label: 'Experience' },
		{ id: 'leadership', label: 'Leadership' },
		{ id: 'skills', label: 'Skills' },
		{ id: 'achievements', label: 'Achievements' },
		{ id: 'publications', label: 'Publications' },
		{ id: 'custom', label: 'Custom' },
		{ id: 'layout', label: 'Layout' },
		{ id: 'fonts', label: 'Fonts' },
		{ id: 'colors', label: 'Colors' },
	];
</script>

<!--
	Locked to the viewport from lg up so the page itself never scrolls: main takes
	the leftover space and the two panels scroll inside it, which means header and
	footer heights no longer have to be guessed at. Below lg the panels stack, so
	the page scrolls normally there.
-->
<div class="min-h-screen lg:h-screen lg:overflow-hidden bg-gray-100 flex flex-col">
	<AppHeader
		documentType={data.documentType}
		onDocumentTypeChange={(documentType) => {
			// Occupational tailoring does not apply to academic CVs.
			if (documentType === 'cv') tailorOpen = false;
			data = withDocumentType(data, documentType);
		}}
		bind:showCode
		{isCompiling}
		{compileError}
		{compiledPageCount}
		{estimatedOverOnePage}
		onDownload={downloadPdfFile}
		onDownloadTypst={downloadTypstFile}
		onUpload={() => (uploadOpen = true)}
		onTemplate={() => (templateOpen = true)}
		onTailor={() => (tailorOpen = true)}
		hasCustomTemplate={customTemplate !== null}
	/>

	{#if data.documentType === 'resume'}
		<OnetDrawer
			bind:open={tailorOpen}
			bind:data
			pageCount={compiledPageCount}
			onInserted={() => (showReviewBanner = true)}
		/>
	{/if}

	<main class="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:flex-1 lg:min-h-0">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-full lg:min-h-0">
			<!-- Form Panel -->
			<div class="bg-white rounded-lg shadow p-6 overflow-auto max-h-[calc(100vh-10rem)] lg:max-h-none lg:h-full">
				{#if showReviewBanner}
					<div
						class="mb-4 flex items-start justify-between gap-2 rounded border border-purple-300 bg-purple-50 px-3 py-2 text-sm text-purple-800"
					>
						<span>Purple fields were filled in automatically. Check them before exporting.</span>
						<button class="secondary text-xs px-2 py-0.5" onclick={() => (showReviewBanner = false)}>Dismiss</button>
					</div>
				{/if}
				<TabBar {tabs} bind:activeTab />

				{#if activeTab === 'personal'}
					<PersonalForm {data} />
				{:else if activeTab === 'profile'}
					<ProfileForm {data} />
				{:else if activeTab === 'clearance'}
					<ClearanceForm {data} />
				{:else if activeTab === 'education'}
					<EducationForm {data} />
				{:else if activeTab === 'projects'}
					<ProjectsForm {data} />
				{:else if activeTab === 'experience'}
					<ExperienceForm {data} />
				{:else if activeTab === 'leadership'}
					<LeadershipForm {data} />
				{:else if activeTab === 'skills'}
					<SkillsForm {data} />
				{:else if activeTab === 'achievements'}
					<AchievementsForm {data} />
				{:else if activeTab === 'publications'}
					<PublicationsForm {data} />
				{:else if activeTab === 'custom'}
					<CustomSectionsForm {data} />
				{:else if activeTab === 'layout'}
					<LayoutForm {data} />
				{:else if activeTab === 'fonts'}
					<FontsForm {data} />
				{:else if activeTab === 'colors'}
					<ColorsForm {data} />
				{/if}
			</div>

			<!-- Preview Panel -->
			<PreviewPanel
				{showCode}
				{typstCode}
				{preview}
				{isPreviewLoading}
				documentLabel={data.documentType === 'cv' ? 'CV' : 'Resume'}
			/>
		</div>
	</main>

	<AppFooter />
	<UploadModal bind:open={uploadOpen} onApplied={() => (showReviewBanner = true)} />
	<TemplateModal bind:open={templateOpen} {data} currentTemplate={customTemplate} />
</div>
