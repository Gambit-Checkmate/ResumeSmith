<script lang="ts">
	import { onMount } from 'svelte';
	import { resumeStore } from '$lib/store';
	import { onetStore } from '$lib/onet-store';
	import { generateTypstCode, typstDownload } from '$lib/typst-generator';
	import { downloadBlob } from '$lib/browser-download';
	import { copyResumeText, serializeResumeText } from '$lib/resume-text';
	import {
		initCompiler,
		compileToPdf,
		compileToPreview,
		downloadPdf,
		setDocumentFonts,
		type CompiledPreview,
	} from '$lib/pdf-compiler';
	import type { DocumentType, ResumeData } from '$lib/types';
	import { defaultResumeData } from '$lib/types';
	import { estimateOverOnePage, withDocumentType } from '$lib/resume-utils';
	import { customTemplateStores, type CustomTemplate } from '$lib/template-store';
	import { createPreviewScheduler } from '$lib/preview-scheduler';
	import { bibliographyStore } from '$lib/bibliography-store';
	import { resetHighlights } from '$lib/ai-highlight';
	import type { ResumeBackup } from '$lib/resume-backup';
	import {
		OWNED_LOCAL_STORAGE_KEYS,
		OWNED_SESSION_STORAGE_KEYS,
		removeOwnedStorageKeys,
		type StorageRemovalResult,
	} from '$lib/clear-browser-data';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import BackupModal from '$lib/components/BackupModal.svelte';
	import ClearDataModal from '$lib/components/ClearDataModal.svelte';
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
	import PresentationsForm from '$lib/components/forms/PresentationsForm.svelte';
	import CustomSectionsForm from '$lib/components/forms/CustomSectionsForm.svelte';
	import LayoutForm from '$lib/components/forms/LayoutForm.svelte';
	import FontsForm from '$lib/components/forms/FontsForm.svelte';
	import ColorsForm from '$lib/components/forms/ColorsForm.svelte';

	let data: ResumeData = $state(structuredClone(defaultResumeData));
	let activeTab = $state('personal');
	let showCode = $state(false);
	let isCompiling = $state(false);
	let compileError = $state<string | null>(null);
	let textExportStatus = $state('');
	let customTemplates = $state<Record<DocumentType, CustomTemplate | null>>({ resume: null, cv: null });
	let customTemplate = $derived(customTemplates[data.documentType]);
	// The bibliography lives in its own store and only ever renders in a CV.
	let bibliography = $derived(data.documentType === 'cv' ? $bibliographyStore : null);
	let typstCode = $derived(generateTypstCode(data, customTemplate?.source, bibliography));
	let preview = $state<CompiledPreview | null>(null);
	let isPreviewLoading = $state(false);
	let uploadOpen = $state(false);
	let backupOpen = $state(false);
	let clearDataOpen = $state(false);
	let templateOpen = $state(false);
	let tailorOpen = $state(false);
	let showReviewBanner = $state(false);
	let skipNextPersistence = false;
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
		customTemplateStores.resume.loadFromStorage();
		customTemplateStores.cv.loadFromStorage();
		bibliographyStore.loadFromStorage();
		const unsub = resumeStore.subscribe((val) => {
			data = val;
		});
		const unsubTemplates = (['resume', 'cv'] as const).map((documentType) =>
			customTemplateStores[documentType].subscribe((value) => {
				customTemplates[documentType] = value;
			}),
		);
		initCompiler().catch(console.error);
		return () => {
			previewScheduler.dispose();
			unsub();
			unsubTemplates.forEach((unsubscribe) => unsubscribe());
		};
	});

	$effect(() => {
		// Track nested edits even on the reset pass, so saving resumes on the next edit.
		const snapshot = $state.snapshot(data);
		if (skipNextPersistence) {
			skipNextPersistence = false;
			return;
		}
		resumeStore.set(data);
		resumeStore.saveToStorage(snapshot);
	});

	function clearBrowserData(): string | null {
		const unavailable = (keys: readonly string[]): StorageRemovalResult => ({ removed: [], failed: [...keys] });
		let localResult = unavailable(OWNED_LOCAL_STORAGE_KEYS);
		let sessionResult = unavailable(OWNED_SESSION_STORAGE_KEYS);
		try {
			localResult = removeOwnedStorageKeys(window.localStorage, OWNED_LOCAL_STORAGE_KEYS);
		} catch {
			/* Storage access can be blocked by the browser. */
		}
		try {
			sessionResult = removeOwnedStorageKeys(window.sessionStorage, OWNED_SESSION_STORAGE_KEYS);
		} catch {
			/* Storage access can be blocked by the browser. */
		}

		// Cancel validation-backed hydrations and reset all application state even if storage is blocked.
		skipNextPersistence = true;
		resumeStore.reset();
		onetStore.clear();
		customTemplateStores.resume.clear();
		customTemplateStores.cv.clear();
		bibliographyStore.clear();
		resetHighlights();
		activeTab = 'personal';
		showCode = false;
		showReviewBanner = false;
		textExportStatus = '';
		compileError = null;
		tailorOpen = false;

		const failed = [...localResult.failed, ...sessionResult.failed];
		if (failed.length) {
			return 'The page was reset, but browser storage could not confirm removal of all saved data. Check your browser storage settings and try again.';
		}
		return null;
	}

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
		const { source, filename } = typstDownload(data, customTemplate?.source, bibliography);
		downloadBlob(new Blob([source], { type: 'text/plain;charset=utf-8' }), filename);
	}

	async function copyTextFile() {
		const copied = await copyResumeText(serializeResumeText(data), navigator.clipboard);
		textExportStatus = copied
			? 'Resume text copied to clipboard.'
			: 'Could not copy resume text. Download .txt is still available.';
	}

	function downloadTextFile() {
		const name = (data.personalInfo.name.trim() || 'resume').replace(/[\\/:*?"<>|]/g, '_');
		downloadBlob(new Blob([serializeResumeText(data)], { type: 'text/plain;charset=utf-8' }), `${name}.txt`);
		textExportStatus = 'Resume text downloaded.';
	}

	function applyBackup(backup: ResumeBackup) {
		resumeStore.set(JSON.parse(JSON.stringify(backup.resume)) as ResumeData);
		if (backup.occupation) onetStore.select(backup.occupation);
		else onetStore.clear();
		resetHighlights();
		showReviewBanner = false;
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
		{ id: 'presentations', label: 'Presentations' },
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
		onCopyText={copyTextFile}
		onDownloadText={downloadTextFile}
		{textExportStatus}
		onBackup={() => (backupOpen = true)}
		onClearData={() => (clearDataOpen = true)}
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
				{:else if activeTab === 'presentations'}
					<PresentationsForm {data} />
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
	<BackupModal bind:open={backupOpen} {data} onRestore={applyBackup} />
	<ClearDataModal bind:open={clearDataOpen} onConfirm={clearBrowserData} />
	<UploadModal bind:open={uploadOpen} documentType={data.documentType} onApplied={() => (showReviewBanner = true)} />
	<TemplateModal bind:open={templateOpen} {data} currentTemplate={customTemplate} />
</div>
