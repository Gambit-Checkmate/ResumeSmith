// A separate schema for academic CVs, so the resume schema (and its token cost) stays unchanged.
// Each request covers one bounded part of the CV; the browser stitches the parts together.
import type { ExtractedCv } from '$lib/cv-extraction';
import { isPresentationKind } from '$lib/presentation';
import { isPublicationStatus } from '$lib/publication';
import { RESUME_SCHEMA } from './extraction';

export const CV_EXTRACTION_PROMPT = [
	'You extract structured data from one part of an academic CV.',
	'The CV was split into parts that are extracted separately, so this part may start or end in the middle of a section; extract only the entries in this part.',
	'Fill every field of the provided JSON schema using only information present in this part.',
	'Use an empty string for any missing text field and an empty array for any missing list.',
	'Format dates as "YYYY-MM" when a month and year are available; otherwise use "YYYY" or an empty string. Custom section dates are free text, such as "2019 - 2022".',
	'Set isPresent to true only when the CV says a position or degree is ongoing (e.g. "Present", "Current").',
	'For linkedin and github, return just the username/handle, not the full URL.',
	'Put academic and professional appointments in workExperience, honors and awards in achievements, journal articles, conference papers, books, and chapters in publications, and talks and posters in presentations.',
	'For each publication, copy the author list as written, and split volume, issue, pages, and DOI into their own fields. Use status "in press" or "under review" only when the CV says so; otherwise "published".',
	'For presentations, use kind "invited" only when the CV says the talk was invited, "poster" for posters, and otherwise "contributed".',
	'Put every other kind of section, such as grants, teaching, service, advising, or memberships, in customSections, keeping the heading as written in the CV.',
	'Do not invent, guess, or derive any value that is not explicitly present, especially contact details and profile URLs.',
].join(' ');

const properties = RESUME_SCHEMA.properties;
const stringArray = { type: 'array', items: { type: 'string' } } as const;

// Strict json_schema for the OpenAI Responses API. All properties required; no extras.
export const CV_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: [
		'personalInfo',
		'profile',
		'education',
		'workExperience',
		'skills',
		'achievements',
		'publications',
		'presentations',
		'customSections',
	],
	properties: {
		personalInfo: properties.personalInfo,
		profile: properties.profile,
		education: properties.education,
		workExperience: properties.workExperience,
		skills: properties.skills,
		achievements: properties.achievements,
		publications: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'authors', 'venue', 'date', 'url', 'volume', 'issue', 'pages', 'doi', 'status'],
				properties: {
					title: { type: 'string' },
					authors: { type: 'string' },
					venue: { type: 'string' },
					date: { type: 'string' },
					url: { type: 'string' },
					volume: { type: 'string' },
					issue: { type: 'string' },
					pages: { type: 'string' },
					doi: { type: 'string' },
					status: { type: 'string', enum: ['published', 'in press', 'under review'] },
				},
			},
		},
		presentations: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'event', 'location', 'date', 'kind', 'url'],
				properties: {
					title: { type: 'string' },
					event: { type: 'string' },
					location: { type: 'string' },
					date: { type: 'string' },
					kind: { type: 'string', enum: ['invited', 'contributed', 'poster'] },
					url: { type: 'string' },
				},
			},
		},
		customSections: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['heading', 'entries'],
				properties: {
					heading: { type: 'string' },
					entries: {
						type: 'array',
						items: {
							type: 'object',
							additionalProperties: false,
							required: ['title', 'date', 'bullets'],
							properties: {
								title: { type: 'string' },
								date: { type: 'string' },
								bullets: stringArray,
							},
						},
					},
				},
			},
		},
	},
} as const;

function record(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown, keys: string[], booleans: string[] = []): boolean {
	return (
		record(value) &&
		keys.every((key) => typeof value[key] === 'string') &&
		booleans.every((key) => typeof value[key] === 'boolean')
	);
}

function bulletsOk(value: unknown): boolean {
	return Array.isArray(value) && value.every((bullet) => typeof bullet === 'string');
}

function list(value: unknown, check: (item: Record<string, unknown>) => boolean): boolean {
	return Array.isArray(value) && value.every((item) => record(item) && check(item));
}

/** Validates parsed structured output for one CV part before it reaches the browser. */
export function validateExtractedCv(value: unknown): ExtractedCv | null {
	if (!record(value)) return null;
	const valid =
		strings(value.personalInfo, ['name', 'phone', 'location', 'email', 'website', 'linkedin', 'github']) &&
		strings(value.profile, ['summary']) &&
		list(
			value.education,
			(item) =>
				strings(item, ['institution', 'location', 'degree', 'major', 'startDate', 'endDate'], ['isPresent']) &&
				bulletsOk(item.bullets),
		) &&
		list(
			value.workExperience,
			(item) =>
				strings(item, ['title', 'company', 'location', 'startDate', 'endDate'], ['isPresent']) &&
				bulletsOk(item.bullets),
		) &&
		list(value.skills, (item) => strings(item, ['category', 'skills'])) &&
		list(value.achievements, (item) => strings(item, ['title', 'date', 'description'])) &&
		list(
			value.publications,
			(item) =>
				strings(item, ['title', 'authors', 'venue', 'date', 'url', 'volume', 'issue', 'pages', 'doi']) &&
				isPublicationStatus(item.status),
		) &&
		list(
			value.presentations,
			(item) => strings(item, ['title', 'event', 'location', 'date', 'url']) && isPresentationKind(item.kind),
		) &&
		list(
			value.customSections,
			(section) =>
				typeof section.heading === 'string' &&
				list(section.entries, (entry) => strings(entry, ['title', 'date']) && bulletsOk(entry.bullets)),
		);
	return valid ? (value as unknown as ExtractedCv) : null;
}
