import type { ResumeData, ExtractedResume, DocumentType, FontSettings } from './types';
import { defaultResumeData, defaultFontSettings, defaultSectionOrder, cvFontSettings } from './types';

const documentFontDefaults: Record<DocumentType, FontSettings> = { resume: defaultFontSettings, cv: cvFontSettings };

/** Switches document type, moving untouched font sizes to the new type's defaults but keeping any the user chose. */
export function withDocumentType(data: ResumeData, documentType: DocumentType): ResumeData {
	if (data.documentType === documentType) return data;
	const previousDefaults = documentFontDefaults[data.documentType];
	const untouched = (Object.keys(previousDefaults) as (keyof FontSettings)[]).every(
		(key) => data.fonts[key] === previousDefaults[key],
	);
	return {
		...data,
		documentType,
		fonts: untouched ? { ...documentFontDefaults[documentType] } : data.fonts,
	};
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function generateId(): string {
	return Math.random().toString(36).substring(2, 9);
}

export function toSingleLine(value: string): string {
	return value.replace(/[\r\n]+/g, ' ');
}

export function formatDate(dateStr: string | undefined): string {
	if (!dateStr) return '';
	const [year, month] = dateStr.split('-');
	const monthName = MONTHS[parseInt(month) - 1];
	return `${monthName} ${year}`;
}

// Estimate if resume exceeds one page (rough heuristic based on content)
export function estimateOverOnePage(data: ResumeData): boolean {
	let lines = 0;
	lines += data.profile.summary ? 2 : 0;
	lines += data.education.length * 3;
	data.education.forEach((e) => (lines += e.bullets.filter((b) => b).length));
	lines += data.projects.length * 2;
	data.projects.forEach((p) => (lines += p.bullets.filter((b) => b).length));
	lines += data.workExperience.length * 3;
	data.workExperience.forEach((w) => (lines += w.bullets.filter((b) => b).length));
	lines += data.leadership.length * 3;
	data.leadership.forEach((l) => (lines += l.bullets.filter((b) => b).length));
	lines += data.skills.length * 1;
	lines += data.achievements.length * 2;
	lines += data.clearance.length * 2;
	lines += data.publications.length * 2;
	return lines > 55; // Rough estimate for one page
}

// Convert AI-extracted content into a full ResumeData: add ids + default styling.
export function buildResumeFromExtraction(ex: ExtractedResume): ResumeData {
	const withId = <T>(items: T[]): (T & { id: string })[] => items.map((item) => ({ ...item, id: generateId() }));

	return {
		documentType: 'resume',
		personalInfo: { ...defaultResumeData.personalInfo, ...ex.personalInfo },
		profile: { summary: ex.profile?.summary ?? '' },
		education: withId(ex.education ?? []),
		projects: withId(ex.projects ?? []),
		workExperience: withId(ex.workExperience ?? []),
		leadership: withId(ex.leadership ?? []),
		skills: withId(ex.skills ?? []),
		achievements: withId(ex.achievements ?? []),
		publications: withId(ex.publications ?? []).map((publication) => ({
			...publication,
			volume: '',
			issue: '',
			pages: '',
			doi: '',
			status: 'published' as const,
		})),
		publicationAuthorName: '',
		customSections: [],
		clearance: withId(ex.clearance ?? []),
		colors: { ...defaultResumeData.colors },
		fonts: { ...defaultFontSettings },
		fontFamilies: { ...defaultResumeData.fontFamilies },
		sectionOrder: [...defaultSectionOrder],
	};
}
