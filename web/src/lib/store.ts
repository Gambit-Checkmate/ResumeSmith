import { writable } from 'svelte/store';
import type { CustomSection, CustomSectionEntry, DocumentType, ResumeData, SectionKey } from './types';
import { generateId } from './resume-utils';
import { customSectionKey, defaultResumeData, defaultSectionOrder, documentTypes } from './types';

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const texts = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
const objects = (value: unknown): Record<string, unknown>[] =>
	Array.isArray(value) ? value.filter((item) => typeof item === 'object' && item !== null && !Array.isArray(item)) : [];

// Custom sections are generated into Typst, so anything malformed is repaired or dropped here.
function normalizeCustomSections(value: unknown): CustomSection[] {
	const seen = new Set<string>();
	return objects(value)
		.filter((section) => {
			if (typeof section.id !== 'string' || !section.id || seen.has(section.id)) return false;
			seen.add(section.id);
			return true;
		})
		.map((section) => ({
			id: section.id as string,
			heading: text(section.heading),
			entries: objects(section.entries).map(
				(entry): CustomSectionEntry => ({
					id: text(entry.id) || generateId(),
					title: text(entry.title),
					date: text(entry.date),
					bullets: texts(entry.bullets),
				}),
			),
		}));
}

// Old saved data can predate fields added to ResumeData since it was written
// (e.g. clearance); fill those in from defaults instead of leaving them undefined.
export function mergeWithDefaults(saved: Partial<ResumeData>): ResumeData {
	const defaults = structuredClone(defaultResumeData);
	const customSections = normalizeCustomSections(saved.customSections);
	const knownKeys: SectionKey[] = [
		...defaultSectionOrder,
		...customSections.map((section) => customSectionKey(section.id)),
	];
	const savedOrder = Array.isArray(saved.sectionOrder)
		? saved.sectionOrder.filter(
				(id, index): id is SectionKey => knownKeys.includes(id) && saved.sectionOrder?.indexOf(id) === index,
			)
		: [];
	const sectionOrder = [...savedOrder, ...knownKeys.filter((id) => !savedOrder.includes(id))];
	const arrays = <K extends keyof ResumeData>(key: K): ResumeData[K] =>
		(Array.isArray(saved[key]) ? saved[key] : defaults[key]) as ResumeData[K];

	return {
		...defaults,
		...saved,
		// Data saved before document types existed is a resume.
		documentType: documentTypes.includes(saved.documentType as DocumentType)
			? (saved.documentType as DocumentType)
			: defaults.documentType,
		personalInfo: { ...defaults.personalInfo, ...saved.personalInfo },
		profile: { ...defaults.profile, ...saved.profile },
		colors: { ...defaults.colors, ...saved.colors },
		fonts: { ...defaults.fonts, ...saved.fonts },
		fontFamilies: { ...defaults.fontFamilies, ...saved.fontFamilies },
		clearance: arrays('clearance'),
		education: arrays('education'),
		projects: arrays('projects'),
		workExperience: arrays('workExperience'),
		leadership: arrays('leadership'),
		skills: arrays('skills'),
		achievements: arrays('achievements'),
		publications: arrays('publications'),
		customSections,
		sectionOrder,
	};
}

export function createResumeStore() {
	const { subscribe, set, update } = writable<ResumeData>(structuredClone(defaultResumeData));

	return {
		subscribe,
		set,
		update,
		reset: () => set(structuredClone(defaultResumeData)),
		loadFromStorage: () => {
			if (typeof window !== 'undefined') {
				try {
					const saved = window.localStorage.getItem('resumeData');
					if (saved) {
						set(mergeWithDefaults(JSON.parse(saved)));
					}
				} catch (e) {
					console.error('Failed to load saved resume data:', e);
				}
			}
		},
		saveToStorage: (data: ResumeData) => {
			try {
				if (typeof window !== 'undefined') window.localStorage.setItem('resumeData', JSON.stringify(data));
			} catch (e) {
				console.error('Failed to save resume data:', e);
			}
		},
	};
}

export const resumeStore = createResumeStore();
