<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';
	import { normalizeDoi, publicationStatuses, publicationStatusLabels } from '$lib/publication';

	let { data }: { data: ResumeData } = $props();

	function addPublication() {
		data.publications = [
			...data.publications,
			{
				id: generateId(),
				title: '',
				authors: '',
				venue: '',
				date: '',
				url: '',
				volume: '',
				issue: '',
				pages: '',
				doi: '',
				status: 'published',
			},
		];
	}
	function removePublication(id: string) {
		data.publications = data.publications.filter((p) => p.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Publications</h2>
		<button class="primary text-sm" onclick={addPublication}>+ Add publication</button>
	</div>
	<div>
		<label for="publication-author-name">Your name in author lists</label>
		<input
			id="publication-author-name"
			type="text"
			bind:value={data.publicationAuthorName}
			placeholder="Doe, J."
			aria-describedby="publication-author-name-help"
		/>
		<p id="publication-author-name-help" class="mt-1 text-xs text-gray-500">
			Written exactly as in your author lists. It is shown in bold wherever it appears.
		</p>
	</div>
	{#each data.publications as publication, i (publication.id)}
		{@const id = `publication-${publication.id}`}
		<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
			<div class="flex justify-between items-start gap-2">
				<div class="flex-1">
					<label for="{id}-title">Title</label><input
						id="{id}-title"
						type="text"
						bind:value={publication.title}
						placeholder="Efficient Parsing of Structured Documents"
						class:ai-filled={aiFilled.has(`publications.${i}.title`)}
						oninput={() => clearHighlight(`publications.${i}.title`)}
					/>
				</div>
				<button class="danger text-sm px-2 py-1 mt-6" onclick={() => removePublication(publication.id)}>Remove</button>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label for="{id}-authors">Authors</label><input
						id="{id}-authors"
						type="text"
						bind:value={publication.authors}
						placeholder="Doe, J., Smith, A."
						class:ai-filled={aiFilled.has(`publications.${i}.authors`)}
						oninput={() => clearHighlight(`publications.${i}.authors`)}
					/>
				</div>
				<div>
					<label for="{id}-venue">Journal or Conference</label><input
						id="{id}-venue"
						type="text"
						bind:value={publication.venue}
						placeholder="Proceedings of Example Conf"
						class:ai-filled={aiFilled.has(`publications.${i}.venue`)}
						oninput={() => clearHighlight(`publications.${i}.venue`)}
					/>
				</div>
				<div>
					<label for="{id}-date">Date</label><input
						id="{id}-date"
						type="month"
						bind:value={publication.date}
						class:ai-filled={aiFilled.has(`publications.${i}.date`)}
						oninput={() => clearHighlight(`publications.${i}.date`)}
					/>
				</div>
				<div>
					<label for="{id}-status">Status</label>
					<select id="{id}-status" bind:value={publication.status}>
						{#each publicationStatuses as status}
							<option value={status}>{publicationStatusLabels[status]}</option>
						{/each}
					</select>
				</div>
				<div class="grid grid-cols-3 gap-2 md:col-span-2">
					<div>
						<label for="{id}-volume">Volume</label><input
							id="{id}-volume"
							type="text"
							bind:value={publication.volume}
							placeholder="12"
							class:ai-filled={aiFilled.has(`publications.${i}.volume`)}
							oninput={() => clearHighlight(`publications.${i}.volume`)}
						/>
					</div>
					<div>
						<label for="{id}-issue">Issue</label><input
							id="{id}-issue"
							type="text"
							bind:value={publication.issue}
							placeholder="3"
							class:ai-filled={aiFilled.has(`publications.${i}.issue`)}
							oninput={() => clearHighlight(`publications.${i}.issue`)}
						/>
					</div>
					<div>
						<label for="{id}-pages">Pages</label><input
							id="{id}-pages"
							type="text"
							bind:value={publication.pages}
							placeholder="45-67"
							class:ai-filled={aiFilled.has(`publications.${i}.pages`)}
							oninput={() => clearHighlight(`publications.${i}.pages`)}
						/>
					</div>
				</div>
				<div>
					<label for="{id}-doi">DOI</label><input
						id="{id}-doi"
						type="text"
						bind:value={publication.doi}
						placeholder="10.1234/example"
						aria-invalid={publication.doi.trim() !== '' && !normalizeDoi(publication.doi)}
						aria-describedby="{id}-doi-help"
						class:ai-filled={aiFilled.has(`publications.${i}.doi`)}
						oninput={() => clearHighlight(`publications.${i}.doi`)}
					/>
					{#if publication.doi.trim() && !normalizeDoi(publication.doi)}
						<p id="{id}-doi-help" class="mt-1 text-xs text-red-600">
							Not a DOI, so it will be left out. DOIs start with 10.
						</p>
					{/if}
				</div>
				<div>
					<label for="{id}-url">Link</label><input
						id="{id}-url"
						type="text"
						bind:value={publication.url}
						placeholder="example.com/paper"
						class:ai-filled={aiFilled.has(`publications.${i}.url`)}
						oninput={() => clearHighlight(`publications.${i}.url`)}
					/>
				</div>
			</div>
		</div>
	{/each}
	{#if data.publications.length === 0}<p class="text-gray-500 text-center py-8">No publications added yet.</p>{/if}
</div>
