import { customSectionKey, sectionLabel, type ResumeData, type SectionKey } from './types';
import { presentationKindLabels } from './presentation';

const clean = (value: string | undefined) => (value ?? '').trim();
const details = (...values: (string | undefined)[]) => values.map(clean).filter(Boolean).join(' | ');
const bullets = (values: string[]) =>
	values
		.map(clean)
		.filter(Boolean)
		.map((value) => `- ${value}`);

function date(value: string): string {
	const trimmed = clean(value);
	const match = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/.exec(trimmed);
	if (!match) return trimmed;
	if (!match[2]) return match[1];
	return `${new Date(2000, Number(match[2]) - 1).toLocaleString('en-US', { month: 'short' })} ${match[1]}`;
}

function period(start: string, end: string, present: boolean): string {
	const from = date(start);
	const to = present ? 'Present' : date(end);
	return from && to ? `${from} - ${to}` : from || to;
}

function entries(groups: string[][]): string[] {
	return groups.filter((group) => group.some(Boolean)).flatMap((group, index) => (index ? ['', ...group] : group));
}

function sectionLines(data: ResumeData, key: SectionKey): string[] {
	if (key.startsWith('custom:')) {
		const section = data.customSections.find((item) => customSectionKey(item.id) === key);
		return entries(
			(section?.entries ?? []).map((entry) =>
				[details(entry.title, date(entry.date)), ...bullets(entry.bullets)].filter(Boolean),
			),
		);
	}
	switch (key) {
		case 'profile':
			return clean(data.profile.summary) ? [clean(data.profile.summary)] : [];
		case 'clearance':
			return entries(data.clearance.map((item) => [details(item.level, item.status, date(item.dateGranted))]));
		case 'education':
			return entries(
				data.education.map((item) =>
					[
						details(item.institution, item.location),
						details(item.degree, item.major, period(item.startDate, item.endDate, item.isPresent)),
						...bullets(item.bullets),
					].filter(Boolean),
				),
			);
		case 'projects':
			return entries(
				data.projects.map((item) =>
					[details(item.name, item.stack), details(item.url, item.award), ...bullets(item.bullets)].filter(Boolean),
				),
			);
		case 'experience':
			return entries(
				data.workExperience.map((item) =>
					[
						details(item.title, item.company, item.location),
						period(item.startDate, item.endDate, item.isPresent),
						...bullets(item.bullets),
					].filter(Boolean),
				),
			);
		case 'leadership':
			return entries(
				data.leadership.map((item) =>
					[
						details(item.title, item.organization, item.location),
						period(item.startDate, item.endDate, item.isPresent),
						...bullets(item.bullets),
					].filter(Boolean),
				),
			);
		case 'skills':
			return entries(data.skills.map((item) => [details(item.category, item.skills)]));
		case 'achievements':
			return entries(
				data.achievements.map((item) =>
					[details(item.title, date(item.date)), clean(item.description)].filter(Boolean),
				),
			);
		case 'publications':
			return entries(
				data.publications.map((item) =>
					[
						clean(item.title),
						details(item.authors, item.venue, date(item.date), item.status),
						details(item.volume && `Vol. ${item.volume}`, item.issue && `No. ${item.issue}`, item.pages),
						details(item.doi && `DOI: ${item.doi}`, item.url),
					].filter(Boolean),
				),
			);
		case 'presentations':
			return entries(
				data.presentations.map((item) =>
					[
						clean(item.title),
						details(item.event, item.location, date(item.date), presentationKindLabels[item.kind]),
						clean(item.url),
					].filter(Boolean),
				),
			);
	}
	return [];
}

/** A deterministic, readable export from structured resume data, independent of PDF and Typst. */
export function serializeResumeText(data: ResumeData): string {
	const personal = data.personalInfo;
	const header = [
		clean(personal.name),
		details(personal.email, personal.phone, personal.location),
		details(personal.website, personal.linkedin, personal.github),
	].filter(Boolean);
	const sections = data.sectionOrder.flatMap((key) => {
		const lines = sectionLines(data, key);
		return lines.length ? [`${sectionLabel(key, data.customSections)}\n${lines.join('\n')}`] : [];
	});
	return [...(header.length ? [header.join('\n')] : []), ...sections].join('\n\n');
}

export async function copyResumeText(
	text: string,
	clipboard: Pick<Clipboard, 'writeText'> | undefined,
): Promise<boolean> {
	if (!clipboard) return false;
	try {
		await clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
