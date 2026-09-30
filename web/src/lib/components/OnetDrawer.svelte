<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { onetStore } from '$lib/onet-store';
	import { onetSectionLabels } from '$lib/onet-types';
	import type { OnetOccupation, OnetOccupationRef, OnetSectionName, TailorEdit } from '$lib/onet-types';
	import type { ResumeData } from '$lib/types';
	import { appendBullet, appendSkill, appendSkillToNewCategory, bulletTargets, skillTargets } from '$lib/onet-insert';
	import { applyTailorEdits } from '$lib/onet-apply';
	import { aiFilled } from '$lib/ai-highlight';
	import { createOnetSearch } from '$lib/onet-search';
	import OnetInsertMenu from './OnetInsertMenu.svelte';

	let {
		open = $bindable(),
		data = $bindable(),
		pageCount = null,
		onInserted,
	}: { open: boolean; data: ResumeData; pageCount?: number | null; onInserted: () => void } = $props();

	let query = $state('');
	let results = $state<OnetOccupationRef[]>([]);
	let searching = $state(false);
	let searched = $state(false);
	let occupation = $state<OnetOccupation | null>(null);
	let loading = $state(false);
	let error = $state('');
	let expanded = $state<OnetSectionName | null>('tasks');
	// Key of the item whose insert menu is showing, e.g. "tasks:1234".
	let menuFor = $state<string | null>(null);
	let tailoring = $state(false);
	let tailorError = $state('');
	let tailorNote = $state('');
	let tailorController: AbortController | null = null;
	let tailorRequest = 0;
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let drawer = $state<HTMLElement>();
	let searchInput = $state<HTMLInputElement>();

	const GENERIC_ERROR = "Can't reach O*NET. Check your connection and retry.";
	const search = createOnetSearch(
		async (keyword, signal) => {
			const res = await fetch(`/api/onet/search?keyword=${encodeURIComponent(keyword)}`, { signal });
			if (!res.ok) throw new Error(await readError(res));
			return (await res.json()).occupations;
		},
		(state) => {
			results = state.results;
			searching = state.searching;
			searched = state.searched;
			error = state.error;
		},
		GENERIC_ERROR,
	);

	onDestroy(() => {
		clearTimeout(searchTimer);
		search.invalidate();
	});

	$effect(() => {
		if (!open) return;
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		return () => opener?.focus();
	});

	$effect(() => {
		if (!open) return;
		const showingOccupation = occupation !== null;
		void tick().then(() => (showingOccupation ? drawer : (searchInput ?? drawer))?.focus());
	});

	async function readError(res: Response): Promise<string> {
		try {
			const body = await res.json();
			return body?.error?.message ?? GENERIC_ERROR;
		} catch {
			return GENERIC_ERROR;
		}
	}

	function onQueryInput() {
		clearTimeout(searchTimer);
		search.invalidate();
		const keyword = query;
		if (keyword.trim()) searchTimer = setTimeout(() => void search.run(keyword), 300);
	}

	async function load(ref: OnetOccupationRef) {
		clearTimeout(searchTimer);
		search.invalidate();
		onetStore.select(ref);
		onetStore.saveToStorage();
		results = [];
		query = '';
		searched = false;
		loading = true;
		error = '';
		occupation = null;
		try {
			const res = await fetch(`/api/onet/occupation/${encodeURIComponent(ref.code)}`);
			if (!res.ok) {
				error = await readError(res);
			} else {
				occupation = (await res.json()).occupation;
			}
		} catch {
			error = GENERIC_ERROR;
		} finally {
			loading = false;
		}
	}

	function abandonPendingTailor() {
		tailorController?.abort();
		tailorController = null;
		tailorRequest++;
	}

	function changeOccupation() {
		occupation = null;
		error = '';
		tailorError = '';
		tailorNote = '';
		abandonPendingTailor();
		onetStore.clear();
		onetStore.saveToStorage();
	}

	// Reload the occupation the user picked in a previous session. The edge cache
	// makes this cheap, which is why the payload itself is never persisted.
	$effect(() => {
		if (!open || occupation || loading || error) return;
		const saved = $onetStore;
		if (saved) load(saved);
	});

	function applyPaths(paths: (string | null)[]) {
		const kept = paths.filter((p): p is string => p !== null);
		for (const path of kept) aiFilled.add(path);
		if (kept.length > 0) onInserted();
		menuFor = null;
	}

	function insertBullet(kind: 'experience' | 'project' | 'education' | 'leadership', id: string, text: string) {
		const result = appendBullet(data, kind, id, text);
		data = result.data;
		applyPaths([result.path]);
	}

	function insertSkill(categoryId: string, name: string) {
		const result = appendSkill(data, categoryId, name);
		data = result.data;
		applyPaths([result.path]);
	}

	function insertNewSkillCategory(category: string, name: string) {
		const result = appendSkillToNewCategory(data, category, name);
		data = result.data;
		applyPaths(result.paths);
	}

	// One click sends the resume plus the occupation code to the AI pass and
	// applies whatever comes back, highlighted for review.
	async function autoTailor() {
		if (!occupation || tailoring) return;
		tailoring = true;
		tailorError = '';
		tailorNote = '';
		const submitted: ResumeData = JSON.parse(JSON.stringify(data));
		const controller = new AbortController();
		tailorController = controller;
		const requestId = ++tailorRequest;
		try {
			const res = await fetch('/api/onet/tailor', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ resume: submitted, code: occupation.code, pageCount }),
				signal: controller.signal,
			});
			if (requestId !== tailorRequest) return;
			if (!res.ok) {
				tailorError = await readError(res);
				return;
			}

			const edits: TailorEdit[] = (await res.json()).edits ?? [];
			if (requestId !== tailorRequest) return;

			const result = applyTailorEdits(submitted, data, edits);
			if (result.stale) {
				tailorError = 'Your resume changed while tailoring was running. Review your edits, then try again.';
				return;
			}
			data = result.data;
			applyPaths(result.paths);
			if (result.removed > 0 && result.paths.length === 0) onInserted();

			const changes = result.paths.length + result.removed;
			if (changes === 0) {
				tailorNote =
					edits.length === 0
						? 'No changes. Nothing in this job matched your resume.'
						: 'No changes. Your resume already covers these suggestions.';
			} else {
				const revised = result.paths.length;
				const parts = [
					revised ? `${revised} ${revised === 1 ? 'item added or rewritten' : 'items added or rewritten'}` : '',
					result.removed ? `${result.removed} ${result.removed === 1 ? 'bullet removed' : 'bullets removed'}` : '',
				].filter(Boolean);
				tailorNote = `${parts.join(', ')}. Changes are highlighted in purple.`;
			}
		} catch {
			if (controller.signal.aborted) return;
			tailorError = GENERIC_ERROR;
		} finally {
			if (tailorController === controller) tailorController = null;
			tailoring = false;
		}
	}

	function toggleMenu(key: string) {
		menuFor = menuFor === key ? null : key;
	}

	function toggleSection(name: OnetSectionName) {
		expanded = expanded === name ? null : name;
		menuFor = null;
	}

	function close() {
		clearTimeout(searchTimer);
		search.invalidate();
		open = false;
		menuFor = null;
		// Clear the error so reopening retries. The auto-load effect below bails
		// while `error` is set, so a stale one would wedge the drawer shut.
		error = '';
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			return;
		}
		if (e.key !== 'Tab' || !drawer) return;
		const focusable = Array.from(
			drawer.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])',
			),
		).filter((element) => !element.hasAttribute('hidden'));
		if (focusable.length === 0) {
			e.preventDefault();
			drawer.focus();
			return;
		}
		const first = focusable[0];
		const last = focusable.at(-1)!;
		if (e.shiftKey && (document.activeElement === first || document.activeElement === drawer)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	// Bullet-shaped sections (tasks, work activities) go into experience or
	// projects; everything else goes into a skills category.
	let bulletDests = $derived(bulletTargets(data));
	let skillDests = $derived(skillTargets(data));

	function sectionCount(occ: OnetOccupation, name: OnetSectionName): number {
		if (name === 'technologySkills') return occ.technologySkills.reduce((n, c) => n + c.examples.length, 0);
		return (occ[name] as unknown[]).length;
	}

	const SECTION_ORDER: OnetSectionName[] = [
		'tasks',
		'technologySkills',
		'detailedWorkActivities',
		'skills',
		'knowledge',
		'abilities',
	];
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-40 bg-black/30" transition:fade={{ duration: 150 }} onclick={close}></div>

	<div
		bind:this={drawer}
		class="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
		transition:fly={{ x: 400, duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="tailor-dialog-title"
		tabindex="-1"
		onkeydown={onKeydown}
	>
		<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
			<h2 id="tailor-dialog-title" class="text-lg font-semibold">Tailor to a job</h2>
			<button class="secondary px-2 py-1 text-sm" onclick={close}>Close</button>
		</div>

		<div class="flex-1 overflow-y-auto px-4 py-4">
			{#if !occupation}
				<label for="onet-search">Search O*NET occupations</label>
				<input
					bind:this={searchInput}
					id="onet-search"
					type="text"
					bind:value={query}
					oninput={onQueryInput}
					placeholder="software developer, nurse, electrician..."
				/>

				{#if searching}
					<p class="mt-3 text-sm text-gray-500">Searching...</p>
				{:else if error}
					<p class="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
				{:else if results.length > 0}
					<ul class="mt-3 space-y-1">
						{#each results as ref (ref.code)}
							<li>
								<button
									class="w-full rounded border border-gray-200 bg-white px-3 py-2 text-left text-sm font-normal hover:border-blue-300 hover:bg-blue-50"
									onclick={() => load(ref)}
								>
									<span class="font-medium">{ref.title}</span>
									{#if ref.brightOutlook}
										<span class="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">Bright outlook</span>
									{/if}
									<span class="mt-0.5 block text-xs text-gray-500">{ref.code}</span>
								</button>
							</li>
						{/each}
					</ul>
				{:else if searched}
					<p class="mt-3 text-sm text-gray-500">No occupations matched that search.</p>
				{:else}
					<p class="mt-3 text-sm text-gray-500">Search for the job you're applying to.</p>
				{/if}
			{:else}
				<div class="mb-4 flex items-start justify-between gap-2">
					<div class="min-w-0">
						<p class="text-xs text-gray-500">Tailoring for</p>
						<h3 class="font-semibold">{occupation.title}</h3>
						<details class="mt-1 text-xs text-gray-600">
							<summary class="cursor-pointer text-gray-500 hover:text-gray-800">About this job</summary>
							<p class="mt-1">{occupation.description}</p>
						</details>
					</div>
					<button class="secondary shrink-0 px-2 py-1 text-xs" onclick={changeOccupation}>Change job</button>
				</div>

				<section class="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-3">
					<h4 class="text-sm font-semibold text-blue-950">Let AI do it</h4>
					<p class="mt-0.5 text-xs text-blue-900">
						AI rewrites your resume to fit this job. Changed text turns purple so you can check it.
					</p>
					<button class="primary mt-2 w-full text-sm disabled:opacity-60" onclick={autoTailor} disabled={tailoring}>
						{tailoring ? 'Rewriting...' : 'Rewrite my resume'}
					</button>
					{#if tailorNote}
						<p class="mt-2 rounded border border-blue-200 bg-white px-3 py-2 text-xs text-gray-700">{tailorNote}</p>
					{/if}
					{#if tailorError}
						<p class="mt-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{tailorError}</p>
					{/if}
				</section>

				<h4 class="text-sm font-semibold text-gray-900">Or add items yourself</h4>
				<p class="mb-2 text-xs text-gray-500">Open a list and choose Add to copy an item into your resume.</p>

				{#each SECTION_ORDER as name (name)}
					{@const unavailable = occupation.unavailable.includes(name)}
					<div class="mb-2 rounded border border-gray-200">
						<button
							class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-gray-50"
							onclick={() => toggleSection(name)}
							disabled={unavailable}
							aria-expanded={expanded === name}
						>
							<svg
								class="h-4 w-4 shrink-0 text-gray-400 transition-transform {expanded === name ? 'rotate-90' : ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
								><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg
							>
							<span class="flex-1" class:text-gray-400={unavailable}>{onetSectionLabels[name]}</span>
							<span class="text-xs font-normal text-gray-500">
								{unavailable ? 'No data' : `${sectionCount(occupation, name)} items`}
							</span>
						</button>

						{#if expanded === name && !unavailable}
							<div class="space-y-2 border-t border-gray-200 px-3 py-2">
								{#if name === 'tasks' || name === 'detailedWorkActivities'}
									{#each occupation[name] as item (item.id)}
										{@const key = `${name}:${item.id}`}
										<div>
											<div class="flex items-start gap-2">
												<p class="flex-1 text-sm text-gray-700">{item.text}</p>
												<button
													class="secondary shrink-0 px-2 py-0.5 text-xs"
													onclick={() => toggleMenu(key)}
													aria-expanded={menuFor === key}
													title="Add this to your resume">{menuFor === key ? 'Cancel' : 'Add'}</button
												>
											</div>
											{#if menuFor === key}
												<OnetInsertMenu
													heading="Add as a bullet point to:"
													targets={bulletDests}
													emptyMessage="Add an experience or project on the Experience or Projects tab first, then come back."
													onPick={(id) => {
														const target = bulletDests.find((t) => t.id === id)!;
														insertBullet(target.kind, id, item.text);
													}}
												/>
											{/if}
										</div>
									{/each}
								{:else if name === 'technologySkills'}
									{#each occupation.technologySkills as category (category.category)}
										<div>
											<p class="text-xs font-medium text-gray-500">{category.category}</p>
											<div class="mt-1 space-y-1">
												{#each category.examples as example (example.name)}
													{@const key = `tech:${category.category}:${example.name}`}
													<div>
														<div class="flex items-center gap-2">
															<p class="flex-1 text-sm text-gray-700">
																{example.name}
																{#if example.hot}
																	<span class="ml-1 rounded bg-orange-100 px-1 py-0.5 text-xs text-orange-800"
																		>In demand</span
																	>
																{/if}
															</p>
															<button
																class="secondary shrink-0 px-2 py-0.5 text-xs"
																onclick={() => toggleMenu(key)}
																aria-expanded={menuFor === key}
																title="Add this to your resume">{menuFor === key ? 'Cancel' : 'Add'}</button
															>
														</div>
														{#if menuFor === key}
															<OnetInsertMenu
																heading="Add to skill category:"
																targets={skillDests}
																allowNew
																onPick={(id) => insertSkill(id, example.name)}
																onCreate={(cat) => insertNewSkillCategory(cat, example.name)}
															/>
														{/if}
													</div>
												{/each}
											</div>
										</div>
									{/each}
								{:else}
									{#each occupation[name] as element (element.id)}
										{@const key = `${name}:${element.id}`}
										<div>
											<div class="flex items-start gap-2">
												<div class="flex-1">
													<p class="text-sm font-medium text-gray-700">{element.name}</p>
													<p class="text-xs text-gray-500">{element.description}</p>
												</div>
												<button
													class="secondary shrink-0 px-2 py-0.5 text-xs"
													onclick={() => toggleMenu(key)}
													aria-expanded={menuFor === key}
													title="Add this to your resume">{menuFor === key ? 'Cancel' : 'Add'}</button
												>
											</div>
											{#if menuFor === key}
												<OnetInsertMenu
													heading="Add to skill category:"
													targets={skillDests}
													allowNew
													onPick={(id) => insertSkill(id, element.name)}
													onCreate={(cat) => insertNewSkillCategory(cat, element.name)}
												/>
											{/if}
										</div>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			{/if}

			{#if loading}
				<p class="mt-3 text-sm text-gray-500">Loading occupation data...</p>
			{/if}
			{#if error && occupation}
				<p class="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
			{/if}
		</div>

		<p class="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
			Data from
			<a
				href="https://services.onetcenter.org/"
				target="_blank"
				rel="noopener noreferrer"
				class="underline hover:text-gray-700">O*NET Web Services</a
			>
			(USDOL/ETA), CC BY 4.0.
		</p>
	</div>
{/if}
