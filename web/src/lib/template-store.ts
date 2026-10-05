import { writable } from 'svelte/store';
import { compileToPdf } from './pdf-compiler';
import { generateTypstCode, RESUME_CONTENT_MARKER } from './typst-generator';
import { defaultResumeData, type DocumentType, type ResumeData } from './types';

export const TEMPLATE_STORAGE_KEY = 'customTypstTemplate';

// Each document type keeps its own template; the resume keeps the original key so earlier sessions stay valid.
export function templateStorageKey(documentType: DocumentType): string {
	return documentType === 'resume' ? TEMPLATE_STORAGE_KEY : `${TEMPLATE_STORAGE_KEY}:${documentType}`;
}
export const MAX_TEMPLATE_SIZE = 1024 * 1024;

export interface CustomTemplate {
	name: string;
	source: string;
}

const REQUIRED_HELPERS = [
	{ name: 'resume', declaration: /^\s*#let\s+resume\b/m },
	{ name: 'work-heading', declaration: /^\s*#let\s+work-heading\b/m },
	{ name: 'project-heading', declaration: /^\s*#let\s+project-heading\b/m },
	{ name: 'education-heading', declaration: /^\s*#let\s+education-heading\b/m },
	{ name: 'achievement-heading', declaration: /^\s*#let\s+achievement-heading\b/m },
	{ name: 'skills', declaration: /^\s*#let\s+skills\b/m },
];

const RESUME_CONTRACT_FIXTURE: ResumeData = {
	...structuredClone(defaultResumeData),
	personalInfo: {
		name: 'Template Test',
		phone: '555-0100',
		location: 'Example City',
		email: 'test@example.com',
		website: 'example.com',
		linkedin: 'template-test',
		github: 'template-test',
	},
	profile: { summary: 'Representative profile content.' },
	clearance: [{ id: 'clearance', level: 'Public Trust', status: 'Active', dateGranted: '2024-01' }],
	education: [
		{
			id: 'education',
			institution: 'Example University',
			location: 'Example City',
			degree: 'Bachelor of Science',
			major: 'Computer Science',
			startDate: '2020-08',
			endDate: '2024-05',
			isPresent: false,
			bullets: ['Representative education detail.'],
		},
	],
	projects: [
		{
			id: 'project',
			name: 'Example Project',
			stack: 'Typst',
			url: 'example.com/project',
			award: 'Example Award',
			bullets: ['Representative project detail.'],
		},
	],
	workExperience: [
		{
			id: 'work',
			title: 'Engineer',
			company: 'Example Company',
			location: 'Example City',
			startDate: '2024-01',
			endDate: '',
			isPresent: true,
			bullets: ['Representative work detail.'],
		},
	],
	leadership: [
		{
			id: 'leadership',
			title: 'Lead',
			organization: 'Example Organization',
			location: 'Example City',
			startDate: '2023-01',
			endDate: '2023-12',
			isPresent: false,
			bullets: ['Representative leadership detail.'],
		},
	],
	skills: [{ id: 'skills', category: 'Tools', skills: 'Typst' }],
	achievements: [{ id: 'achievement', title: 'Example Achievement', date: '2024-01', description: 'Detail.' }],
	publications: [
		{
			id: 'publication',
			title: 'Example Paper',
			authors: 'T. Test',
			venue: 'Example Journal',
			date: '2024-01',
			url: 'example.com/paper',
			volume: '12',
			issue: '3',
			pages: '45-67',
			doi: '10.1234/example',
			status: 'published',
		},
	],
	publicationAuthorName: 'T. Test',
	presentations: [
		{
			id: 'presentation',
			title: 'Example Talk',
			event: 'Example Conference',
			location: 'Example City',
			date: '2024-01',
			kind: 'invited',
			url: 'example.com/talk',
		},
	],
	customSections: [
		{
			id: 'custom',
			heading: 'Example Section',
			entries: [{ id: 'custom-entry', title: 'Example Entry', date: '2024', bullets: ['Representative detail.'] }],
		},
	],
	sectionOrder: [...defaultResumeData.sectionOrder, 'custom:custom'],
};

const TEMPLATE_CONTRACT_FIXTURES: Record<DocumentType, ResumeData> = {
	resume: RESUME_CONTRACT_FIXTURE,
	cv: { ...RESUME_CONTRACT_FIXTURE, documentType: 'cv' },
};

/** Checks the inexpensive size, marker, and declaration requirements before compiling a template. */
export function validateTemplateSource(source: string): string | null {
	if (!source.trim()) return 'The template is empty.';
	if (new Blob([source]).size > MAX_TEMPLATE_SIZE) return 'The template must be 1 MB or smaller.';
	if (!source.includes(RESUME_CONTENT_MARKER)) {
		return `The template must contain this marker: ${RESUME_CONTENT_MARKER}`;
	}

	const preamble = source.split(RESUME_CONTENT_MARKER, 1)[0];
	const missing = REQUIRED_HELPERS.filter(({ declaration }) => !declaration.test(preamble)).map(({ name }) => name);
	if (missing.length > 0) return `The template is missing required helpers: ${missing.join(', ')}.`;

	return null;
}

/** Compiles a fully populated fixture so every required template helper is exercised before activation. */
export async function validateTemplateCompatibility(
	source: string,
	documentType: DocumentType = 'resume',
): Promise<string | null> {
	const sourceError = validateTemplateSource(source);
	if (sourceError) return sourceError;

	try {
		await compileToPdf(generateTypstCode(TEMPLATE_CONTRACT_FIXTURES[documentType], source));
		return null;
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		return `The template is incompatible with the ${documentType === 'cv' ? 'CV' : 'resume'} format: ${detail}`;
	}
}

function removeStoredTemplate(storage: Storage, key: string): void {
	try {
		storage.removeItem(key);
	} catch (error) {
		console.error('Failed to remove the custom Typst template from session storage:', error);
	}
}

function createCustomTemplateStore(documentType: DocumentType) {
	const { subscribe, set } = writable<CustomTemplate | null>(null);
	const key = templateStorageKey(documentType);
	let generation = 0;

	return {
		subscribe,
		loadFromStorage: async () => {
			if (typeof window === 'undefined') return;
			const loadGeneration = generation;

			let storage: Storage;
			let saved: string | null;
			try {
				storage = window.sessionStorage;
				saved = storage.getItem(key);
			} catch (error) {
				console.error('Failed to access session storage for the custom Typst template:', error);
				return;
			}
			if (!saved) return;

			let template: CustomTemplate;
			try {
				template = JSON.parse(saved) as CustomTemplate;
			} catch (error) {
				console.error('Failed to parse the custom Typst template:', error);
				removeStoredTemplate(storage, key);
				return;
			}

			const invalid =
				typeof template?.name !== 'string' ||
				typeof template?.source !== 'string' ||
				(await validateTemplateCompatibility(template.source, documentType));
			if (loadGeneration !== generation) return;
			if (invalid) {
				removeStoredTemplate(storage, key);
				return;
			}
			set(template);
		},
		save: (template: CustomTemplate) => {
			generation++;
			try {
				if (typeof window !== 'undefined') {
					window.sessionStorage.setItem(key, JSON.stringify(template));
				}
			} catch (error) {
				console.error('Failed to save the custom Typst template to session storage:', error);
			}
			set(template);
		},
		clear: () => {
			generation++;
			try {
				if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
			} catch (error) {
				console.error('Failed to clear the custom Typst template from session storage:', error);
			}
			set(null);
		},
	};
}

export const customTemplateStores: Record<DocumentType, ReturnType<typeof createCustomTemplateStore>> = {
	resume: createCustomTemplateStore('resume'),
	cv: createCustomTemplateStore('cv'),
};

export const customTemplateStore = customTemplateStores.resume;
