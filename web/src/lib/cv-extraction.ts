// Long academic CVs do not fit one extraction request inside the serverless limits, so the browser
// splits the extracted text into bounded parts, each part is extracted on its own, and the results
// are stitched back together here. Everything in this file is pure so it runs in both environments.
import type {
	CustomSection,
	Education,
	PersonalInfo,
	Presentation,
	Profile,
	Publication,
	ResumeData,
	SkillCategory,
	WorkExperience,
	Achievement,
	SectionKey,
} from './types';
import { customSectionKey, cvFontSettings, defaultResumeData, defaultSectionOrder } from './types';
import { generateId } from './resume-utils';

/** The size the browser aims for per part. */
export const CV_CHUNK_CHARS = 10_000;
/** The size the server accepts per part: the target plus room for a short tail folded into the last part. */
export const MAX_CV_CHUNK_CHARS = 12_000;
/** A 120,000 character document split into parts of at least 8,000 characters, plus a remainder. */
export const MAX_CV_CHUNKS = 16;
export const MAX_CV_CONTEXT_CHARS = 120;

const PREFERRED_BREAK = 0.8;
const MIN_TAIL_CHARS = 1_000;

export interface CvChunk {
	text: string;
	/** The nearest section heading before this part, so a part that starts mid-section keeps its meaning. */
	context: string;
}

export interface ExtractedCv {
	personalInfo: PersonalInfo;
	profile: Profile;
	education: Omit<Education, 'id'>[];
	workExperience: Omit<WorkExperience, 'id'>[];
	skills: Omit<SkillCategory, 'id'>[];
	achievements: Omit<Achievement, 'id'>[];
	publications: Omit<Publication, 'id'>[];
	presentations: Omit<Presentation, 'id'>[];
	customSections: { heading: string; entries: { title: string; date: string; bullets: string[] }[] }[];
}

/** A short line made of words, like "Publications" or "Grants & Funding:", read as a section heading. */
export function isHeadingLine(line: string): boolean {
	const trimmed = line.trim();
	if (trimmed.length < 3 || trimmed.length > 60) return false;
	if (!/^[\p{L}][\p{L}&/,' -]*:?$/u.test(trimmed)) return false;
	return trimmed.split(/\s+/).length <= 6;
}

function hardSplit(line: string, max: number): string[] {
	const pieces: string[] = [];
	for (let start = 0; start < line.length; start += max) pieces.push(line.slice(start, start + max));
	return pieces;
}

/**
 * Splits text at line boundaries into parts of at most `max` characters, preferring to break before a
 * heading or after a blank line once a part is mostly full. A short tail joins the previous part.
 */
export function splitCvText(text: string, max = CV_CHUNK_CHARS): CvChunk[] {
	const trimmed = text.trim();
	if (trimmed.length <= max) return trimmed ? [{ text: trimmed, context: '' }] : [];

	const lines = trimmed.split('\n').flatMap((line) => (line.length > max ? hardSplit(line, max) : [line]));
	const chunks: CvChunk[] = [];
	let current: string[] = [];
	let size = 0;
	let context = '';
	let lastHeading = '';

	lines.forEach((line, index) => {
		const previousBlank = index > 0 && !lines[index - 1].trim();
		const full = size + line.length + 1 > max;
		const preferred = size >= max * PREFERRED_BREAK && (isHeadingLine(line) || previousBlank);
		if (current.length && (full || preferred)) {
			chunks.push({ text: current.join('\n').trim(), context });
			current = [];
			size = 0;
			context = isHeadingLine(line) ? '' : lastHeading;
		}
		current.push(line);
		size += line.length + 1;
		if (isHeadingLine(line)) lastHeading = line.trim().replace(/:$/, '').slice(0, MAX_CV_CONTEXT_CHARS);
	});
	const tail = current.join('\n').trim();
	const previous = chunks.at(-1);
	if (previous && tail.length < MIN_TAIL_CHARS && previous.text.length + tail.length + 1 <= MAX_CV_CHUNK_CHARS) {
		previous.text = `${previous.text}\n${tail}`;
	} else if (tail) {
		chunks.push({ text: tail, context });
	}
	return chunks.filter((chunk) => chunk.text);
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		const id = key(item);
		if (seen.has(id)) return false;
		seen.add(id);
		return true;
	});
}

const unique = <T>(items: T[]): T[] => uniqueBy(items, (item) => JSON.stringify(item));

/**
 * Stitches the successful parts in document order. Contact details and the summary come from the
 * first part that has them; lists are concatenated, dropping exact repeats from overlapping parts;
 * custom sections with the same heading are joined.
 */
export function mergeCvExtractions(parts: ExtractedCv[]): ExtractedCv {
	const personalInfo = { ...defaultResumeData.personalInfo };
	for (const key of Object.keys(personalInfo) as (keyof PersonalInfo)[]) {
		personalInfo[key] = parts.map((part) => part.personalInfo[key]).find((value) => value.trim()) ?? '';
	}

	const sections = new Map<string, ExtractedCv['customSections'][number]>();
	for (const section of parts.flatMap((part) => part.customSections)) {
		const key = section.heading.trim().toLowerCase();
		const existing = sections.get(key);
		if (existing) existing.entries = unique([...existing.entries, ...section.entries]);
		else sections.set(key, { heading: section.heading.trim(), entries: unique(section.entries) });
	}

	return {
		personalInfo,
		profile: { summary: parts.map((part) => part.profile.summary).find((value) => value.trim()) ?? '' },
		education: unique(parts.flatMap((part) => part.education)),
		workExperience: unique(parts.flatMap((part) => part.workExperience)),
		skills: unique(parts.flatMap((part) => part.skills)),
		achievements: unique(parts.flatMap((part) => part.achievements)),
		publications: unique(parts.flatMap((part) => part.publications)),
		presentations: unique(parts.flatMap((part) => part.presentations)),
		customSections: [...sections.values()].filter((section) => section.heading),
	};
}

// Academic CVs usually lead with education and scholarship rather than a skills summary.
const CV_SECTION_ORDER: SectionKey[] = [
	'profile',
	'education',
	'experience',
	'publications',
	'presentations',
	'achievements',
	'skills',
];

/** Converts a stitched CV extraction into editable CV data with ids and CV defaults. */
export function buildResumeFromCvExtraction(extracted: ExtractedCv): ResumeData {
	const withId = <T>(items: T[]): (T & { id: string })[] => items.map((item) => ({ ...item, id: generateId() }));
	const customSections: CustomSection[] = extracted.customSections.map((section) => ({
		id: generateId(),
		heading: section.heading,
		entries: withId(section.entries),
	}));
	const customKeys = customSections.map((section) => customSectionKey(section.id));

	return {
		...structuredClone(defaultResumeData),
		documentType: 'cv',
		fonts: { ...cvFontSettings },
		personalInfo: { ...defaultResumeData.personalInfo, ...extracted.personalInfo },
		profile: { summary: extracted.profile.summary },
		education: withId(extracted.education),
		workExperience: withId(extracted.workExperience),
		skills: withId(extracted.skills),
		achievements: withId(extracted.achievements),
		publications: withId(extracted.publications),
		presentations: withId(extracted.presentations),
		customSections,
		sectionOrder: [
			...CV_SECTION_ORDER,
			...customKeys,
			...defaultSectionOrder.filter((id) => !CV_SECTION_ORDER.includes(id)),
		],
	};
}
