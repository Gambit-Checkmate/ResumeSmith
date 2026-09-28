import { writable } from 'svelte/store';
import type { DocumentType, ResumeData, SectionId } from './types';
import { defaultResumeData, defaultSectionOrder, documentTypes } from './types';

// Old saved data can predate fields added to ResumeData since it was written
// (e.g. clearance); fill those in from defaults instead of leaving them undefined.
export function mergeWithDefaults(saved: Partial<ResumeData>): ResumeData {
	const defaults = structuredClone(defaultResumeData);
	const savedOrder = Array.isArray(saved.sectionOrder)
		? saved.sectionOrder.filter(
				(id, index): id is SectionId =>
					defaultSectionOrder.includes(id as SectionId) && saved.sectionOrder?.indexOf(id) === index,
			)
		: [];
	const sectionOrder = [...savedOrder, ...defaultSectionOrder.filter((id) => !savedOrder.includes(id))];
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
