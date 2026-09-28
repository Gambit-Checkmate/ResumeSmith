export interface PersonalInfo {
	name: string;
	phone: string;
	location: string;
	email: string;
	website: string;
	linkedin: string;
	github: string;
}

export interface Profile {
	summary: string;
}

export interface WorkExperience {
	id: string;
	title: string;
	company: string;
	location: string;
	startDate: string;
	endDate: string;
	isPresent: boolean;
	bullets: string[];
}

export interface Project {
	id: string;
	name: string;
	stack: string;
	url: string;
	award: string; // e.g., "NexHacks 2026 (1st Place)"
	bullets: string[];
}

export interface Education {
	id: string;
	institution: string;
	location: string;
	degree: string;
	major: string;
	startDate: string;
	endDate: string;
	isPresent: boolean;
	bullets: string[];
}

export interface Leadership {
	id: string;
	title: string;
	organization: string;
	location: string;
	startDate: string;
	endDate: string;
	isPresent: boolean;
	bullets: string[];
}

export interface Achievement {
	id: string;
	title: string;
	date: string;
	description: string;
}

export type PublicationStatus = 'published' | 'in press' | 'under review';

export interface Publication {
	id: string;
	title: string;
	authors: string;
	venue: string;
	date: string;
	url: string;
	volume: string;
	issue: string;
	pages: string;
	doi: string;
	status: PublicationStatus;
}

// Resume extraction predates the typed citation fields and still returns only these.
export type ResumePublication = Pick<Publication, 'title' | 'authors' | 'venue' | 'date' | 'url'>;

// A user-named section (grants, teaching, service, ...) built from freeform entries.
export interface CustomSectionEntry {
	id: string;
	title: string;
	date: string; // Freeform, e.g. "2019 - 2022" or "Fall 2023".
	bullets: string[];
}

export interface CustomSection {
	id: string;
	heading: string;
	entries: CustomSectionEntry[];
}

export type ClearanceLevel = 'Confidential' | 'Secret' | 'Top Secret' | 'Top Secret/SCI' | 'Public Trust';
export type ClearanceStatus = 'Active' | 'Inactive' | 'Eligible';

export interface Clearance {
	id: string;
	level: ClearanceLevel;
	status: ClearanceStatus;
	dateGranted: string;
}

export interface SkillCategory {
	id: string;
	category: string;
	skills: string;
}

export interface ColorSettings {
	headColor: string;
	textColor: string;
	accentColor: string;
	linkColor: string;
}

export interface FontSettings {
	baseSize: number;
	nameSize: number;
	headingSize: number;
	contactSize: number;
}

export const defaultFontSettings: FontSettings = {
	baseSize: 8.7,
	nameSize: 20.7,
	headingSize: 16.8,
	contactSize: 11.2,
};

// Academic CVs run several pages, so they start from a more readable size than the dense one-page resume.
export const cvFontSettings: FontSettings = {
	baseSize: 10.5,
	nameSize: 20.7,
	headingSize: 14,
	contactSize: 10,
};

export type DocumentType = 'resume' | 'cv';

export const documentTypes: DocumentType[] = ['resume', 'cv'];

export const documentTypeLabels: Record<DocumentType, string> = {
	resume: 'Resume',
	cv: 'Academic CV',
};

export interface FontFamilies {
	heading: string;
	body: string;
}

export const defaultFontFamilies: FontFamilies = {
	heading: 'Libertinus Serif',
	body: 'Libertinus Serif',
};

export type SectionId =
	| 'profile'
	| 'clearance'
	| 'education'
	| 'projects'
	| 'experience'
	| 'leadership'
	| 'skills'
	| 'achievements'
	| 'publications';

export const defaultSectionOrder: SectionId[] = [
	'profile',
	'clearance',
	'education',
	'projects',
	'experience',
	'leadership',
	'skills',
	'achievements',
	'publications',
];

// Custom sections join the section order as `custom:<section id>`.
export type CustomSectionKey = `custom:${string}`;
export type SectionKey = SectionId | CustomSectionKey;

export const CUSTOM_SECTION_PREFIX = 'custom:';

export function customSectionKey(id: string): CustomSectionKey {
	return `${CUSTOM_SECTION_PREFIX}${id}`;
}

export const sectionLabels: Record<SectionId, string> = {
	profile: 'Profile',
	clearance: 'Clearance',
	education: 'Education',
	projects: 'Projects',
	experience: 'Experience',
	leadership: 'Leadership',
	skills: 'Skills',
	achievements: 'Achievements',
	publications: 'Publications',
};

export interface ResumeData {
	documentType: DocumentType;
	personalInfo: PersonalInfo;
	profile: Profile;
	clearance: Clearance[];
	education: Education[];
	projects: Project[];
	workExperience: WorkExperience[];
	leadership: Leadership[];
	skills: SkillCategory[];
	achievements: Achievement[];
	publications: Publication[];
	// The owner's name as it appears in author lists, bolded in citations.
	publicationAuthorName: string;
	customSections: CustomSection[];
	colors: ColorSettings;
	fonts: FontSettings;
	fontFamilies: FontFamilies;
	sectionOrder: SectionKey[];
}

/** The display name of a built-in or custom section. */
export function sectionLabel(key: SectionKey, customSections: CustomSection[]): string {
	if (!key.startsWith(CUSTOM_SECTION_PREFIX)) return sectionLabels[key as SectionId];
	const section = customSections.find((candidate) => customSectionKey(candidate.id) === key);
	return section?.heading.trim() || 'Untitled section';
}

export const defaultResumeData: ResumeData = {
	documentType: 'resume',
	personalInfo: {
		name: '',
		phone: '',
		location: '',
		email: '',
		website: '',
		linkedin: '',
		github: '',
	},
	profile: {
		summary: '',
	},
	clearance: [],
	education: [],
	projects: [],
	workExperience: [],
	leadership: [],
	skills: [],
	achievements: [],
	publications: [],
	publicationAuthorName: '',
	customSections: [],
	colors: {
		headColor: '#22227f',
		textColor: '#1b1b1b',
		accentColor: '#22328A',
		linkColor: '#1d4ed8',
	},
	fonts: { ...defaultFontSettings },
	fontFamilies: { ...defaultFontFamilies },
	sectionOrder: [...defaultSectionOrder],
};

// Shape returned by the AI extraction endpoint (content only; ids + styling added client-side).
export interface ExtractedResume {
	personalInfo: PersonalInfo;
	profile: Profile;
	education: Omit<Education, 'id'>[];
	projects: Omit<Project, 'id'>[];
	workExperience: Omit<WorkExperience, 'id'>[];
	leadership: Omit<Leadership, 'id'>[];
	skills: Omit<SkillCategory, 'id'>[];
	achievements: Omit<Achievement, 'id'>[];
	publications: ResumePublication[];
	clearance: Omit<Clearance, 'id'>[];
}
