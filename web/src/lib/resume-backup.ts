import { FONT_OPTIONS, FONT_SIZE_BOUNDS } from './fonts';
import { ONET_STORAGE_KEY } from './onet-store';
import type { OnetOccupationRef } from './onet-types';
import { defaultSectionOrder, documentTypes, type ResumeData, type SectionKey } from './types';

export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
export const RESUME_STORAGE_KEY = 'resumeData';

export interface ResumeBackup {
	format: 'resumesmith-backup';
	version: typeof BACKUP_VERSION;
	resume: ResumeData;
	occupation: OnetOccupationRef | null;
}

type Validator = (value: unknown, path: string) => void;

function invalid(path: string): never {
	throw new Error(`Invalid backup: ${path}.`);
}

function record(value: unknown, fields: Record<string, Validator>, path: string): void {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(path);
	const object = value as Record<string, unknown>;
	if (Object.keys(object).length !== Object.keys(fields).length) invalid(path);
	for (const [key, validate] of Object.entries(fields)) {
		if (!Object.hasOwn(object, key)) invalid(`${path}.${key}`);
		validate(object[key], `${path}.${key}`);
	}
}

const string: Validator = (value, path) => {
	if (typeof value !== 'string') invalid(path);
};
const nonempty: Validator = (value, path) => {
	if (typeof value !== 'string' || !value.trim()) invalid(path);
};
const boolean: Validator = (value, path) => {
	if (typeof value !== 'boolean') invalid(path);
};
const date: Validator = (value, path) => {
	if (typeof value !== 'string' || !/^(?:|\d{4}(?:-(?:0[1-9]|1[0-2]))?)$/.test(value)) invalid(path);
};
const color: Validator = (value, path) => {
	if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) invalid(path);
};
const oneOf =
	(options: readonly string[]): Validator =>
	(value, path) => {
		if (typeof value !== 'string' || !options.includes(value)) invalid(path);
	};
const arrayOf =
	(validate: Validator): Validator =>
	(value, path) => {
		if (!Array.isArray(value)) invalid(path);
		value.forEach((item, index) => validate(item, `${path}[${index}]`));
	};
const shape =
	(fields: Record<string, Validator>): Validator =>
	(value, path) =>
		record(value, fields, path);

function validateResume(value: unknown): asserts value is ResumeData {
	const ids = new Set<string>();
	const id: Validator = (value, path) => {
		nonempty(value, path);
		if (ids.has(value as string)) invalid(`${path} (duplicate ID)`);
		ids.add(value as string);
	};
	const bullets = arrayOf(string);
	const dated = { startDate: date, endDate: date, isPresent: boolean, bullets };
	const fields: Record<string, Validator> = {
		documentType: oneOf(documentTypes),
		personalInfo: shape({
			name: string,
			phone: string,
			location: string,
			email: string,
			website: string,
			linkedin: string,
			github: string,
		}),
		profile: shape({ summary: string }),
		clearance: arrayOf(
			shape({
				id,
				level: oneOf(['Confidential', 'Secret', 'Top Secret', 'Top Secret/SCI', 'Public Trust']),
				status: oneOf(['Active', 'Inactive', 'Eligible']),
				dateGranted: date,
			}),
		),
		education: arrayOf(shape({ id, institution: string, location: string, degree: string, major: string, ...dated })),
		projects: arrayOf(shape({ id, name: string, stack: string, url: string, award: string, bullets })),
		workExperience: arrayOf(shape({ id, title: string, company: string, location: string, ...dated })),
		leadership: arrayOf(shape({ id, title: string, organization: string, location: string, ...dated })),
		skills: arrayOf(shape({ id, category: string, skills: string })),
		achievements: arrayOf(shape({ id, title: string, date, description: string })),
		publications: arrayOf(
			shape({
				id,
				title: string,
				authors: string,
				venue: string,
				date: string,
				url: string,
				volume: string,
				issue: string,
				pages: string,
				doi: string,
				status: oneOf(['published', 'in press', 'under review']),
			}),
		),
		publicationAuthorName: string,
		presentations: arrayOf(
			shape({
				id,
				title: string,
				event: string,
				location: string,
				date: string,
				kind: oneOf(['invited', 'contributed', 'poster']),
				url: string,
			}),
		),
		customSections: arrayOf(
			shape({ id, heading: string, entries: arrayOf(shape({ id, title: string, date: string, bullets })) }),
		),
		colors: shape({ headColor: color, textColor: color, accentColor: color, linkColor: color }),
		fonts: shape(
			Object.fromEntries(
				Object.entries(FONT_SIZE_BOUNDS).map(([key, [min, max]]) => [
					key,
					(value: unknown, path: string) => {
						if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) invalid(path);
					},
				]),
			),
		),
		fontFamilies: shape({
			heading: oneOf(FONT_OPTIONS.map((option) => option.family)),
			body: oneOf(FONT_OPTIONS.map((option) => option.family)),
		}),
		sectionOrder: arrayOf(string),
	};
	record(value, fields, 'resume');
	const resume = value as ResumeData;
	const expected = [
		...defaultSectionOrder,
		...resume.customSections.map((section) => `custom:${section.id}` as SectionKey),
	];
	if (
		resume.sectionOrder.length !== expected.length ||
		new Set(resume.sectionOrder).size !== expected.length ||
		expected.some((key) => !resume.sectionOrder.includes(key))
	)
		invalid('resume.sectionOrder');
}

function validateBackup(value: unknown): asserts value is ResumeBackup {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid('root');
	const object = value as Record<string, unknown>;
	if (object.format !== 'resumesmith-backup') invalid('format');
	if (object.version !== BACKUP_VERSION)
		throw new Error('Unsupported backup version. This app can restore version 1 only.');
	record(
		value,
		{
			format: oneOf(['resumesmith-backup']),
			version: (value, path) => {
				if (value !== BACKUP_VERSION) invalid(path);
			},
			resume: (value) => validateResume(value),
			occupation: (value, path) => {
				if (value !== null) record(value, { code: nonempty, title: nonempty, brightOutlook: boolean }, path);
			},
		},
		'backup',
	);
}

function withinLimit(text: string): void {
	if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
		throw new Error('Backup exceeds the 2 MB size limit.');
}

export function createBackup(resume: ResumeData, occupation: OnetOccupationRef | null): string {
	const backup = { format: 'resumesmith-backup', version: BACKUP_VERSION, resume, occupation };
	validateBackup(backup);
	const text = JSON.stringify(backup, null, 2);
	withinLimit(text);
	return text;
}

export function parseBackup(text: string): ResumeBackup {
	withinLimit(text);
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error('Backup is not valid JSON.');
	}
	validateBackup(parsed);
	return parsed;
}

export async function readBackupFile(file: File): Promise<ResumeBackup> {
	if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 2 MB size limit.');
	return parseBackup(await file.text());
}

/** Persist both records before replacing in-memory state. Roll back if storage rejects either write. */
export function persistBackup(
	backup: ResumeBackup,
	storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): void {
	const previousResume = storage.getItem(RESUME_STORAGE_KEY);
	const previousOccupation = storage.getItem(ONET_STORAGE_KEY);
	try {
		storage.setItem(RESUME_STORAGE_KEY, JSON.stringify(backup.resume));
		if (backup.occupation) storage.setItem(ONET_STORAGE_KEY, JSON.stringify(backup.occupation));
		else storage.removeItem(ONET_STORAGE_KEY);
	} catch {
		let rollbackFailed = false;
		try {
			if (previousResume === null) storage.removeItem(RESUME_STORAGE_KEY);
			else storage.setItem(RESUME_STORAGE_KEY, previousResume);
			if (previousOccupation === null) storage.removeItem(ONET_STORAGE_KEY);
			else storage.setItem(ONET_STORAGE_KEY, previousOccupation);
		} catch {
			rollbackFailed = true;
		}
		throw new Error(
			rollbackFailed
				? 'Storage rejected the restore, and rollback also failed. Check browser storage before reloading.'
				: 'Browser storage rejected the restore. Your current resume remains open.',
		);
	}
}
