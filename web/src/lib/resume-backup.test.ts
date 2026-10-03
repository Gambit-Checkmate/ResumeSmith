import { describe, expect, it } from 'vitest';
import { defaultResumeData, type ResumeData } from './types';
import {
	BACKUP_VERSION,
	createBackup,
	MAX_BACKUP_BYTES,
	parseBackup,
	persistBackup,
	readBackupFile,
} from './resume-backup';
import { ONET_STORAGE_KEY } from './onet-store';

const occupation = { code: '15-1252.00', title: 'Software Developers', brightOutlook: true };

function filledResume(): ResumeData {
	const data = structuredClone(defaultResumeData);
	data.documentType = 'cv';
	data.personalInfo = {
		name: 'Example Person',
		phone: '555-0100',
		location: 'Example City',
		email: 'person@example.test',
		website: 'example.test',
		linkedin: 'example',
		github: 'example',
	};
	data.profile.summary = 'Synthetic profile';
	data.clearance = [{ id: 'clearance', level: 'Secret', status: 'Active', dateGranted: '2024-02' }];
	data.education = [
		{
			id: 'education',
			institution: 'Example College',
			location: 'Example City',
			degree: 'BS',
			major: 'Computer Science',
			startDate: '2017',
			endDate: '2021-05',
			isPresent: false,
			bullets: ['Honors'],
		},
	];
	data.projects = [
		{
			id: 'project',
			name: 'Example Project',
			stack: 'TypeScript',
			url: 'https://example.test',
			award: 'Prize',
			bullets: ['Built a tool'],
		},
	];
	data.workExperience = [
		{
			id: 'work',
			title: 'Developer',
			company: 'Example Inc',
			location: 'Remote',
			startDate: '2022-01',
			endDate: '',
			isPresent: true,
			bullets: ['Shipped features'],
		},
	];
	data.leadership = [
		{
			id: 'leadership',
			title: 'Lead',
			organization: 'Example Club',
			location: 'Example City',
			startDate: '2020',
			endDate: '2021',
			isPresent: false,
			bullets: ['Mentored peers'],
		},
	];
	data.skills = [{ id: 'skills', category: 'Languages', skills: 'TypeScript' }];
	data.achievements = [
		{ id: 'achievement', title: 'Synthetic Award', date: '2023-11', description: 'Awarded for testing' },
	];
	data.publications = [
		{
			id: 'publication',
			title: 'Example Paper',
			authors: 'Example Person',
			venue: 'Example Journal',
			date: '2024',
			url: 'https://example.test/paper',
			volume: '1',
			issue: '2',
			pages: '1-2',
			doi: '10.0000/example',
			status: 'in press',
		},
	];
	data.publicationAuthorName = 'Example Person';
	data.presentations = [
		{
			id: 'presentation',
			title: 'Example Talk',
			event: 'Example Conference',
			location: 'Online',
			date: '2024',
			kind: 'invited',
			url: 'https://example.test/talk',
		},
	];
	data.customSections = [
		{
			id: 'custom',
			heading: 'Service',
			entries: [{ id: 'custom-entry', title: 'Volunteer', date: 'Fall 2023', bullets: ['Helped'] }],
		},
	];
	data.colors = { headColor: '#123456', textColor: '#234567', accentColor: '#345678', linkColor: '#456789' };
	data.fonts = { baseSize: 10.5, nameSize: 21, headingSize: 14, contactSize: 10 };
	data.fontFamilies = { heading: 'Lato', body: 'Carlito' };
	data.sectionOrder = ['custom:custom', ...data.sectionOrder.toReversed()];
	return data;
}

function storage(initial: Record<string, string> = {}) {
	const entries = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => entries.get(key) ?? null,
		setItem: (key: string, value: string) => void entries.set(key, value),
		removeItem: (key: string) => void entries.delete(key),
	};
}

describe('editable resume backup', () => {
	it('round-trips every field, section order, date precision, fonts, colors, and occupation without templates', () => {
		const resume = filledResume();
		const text = createBackup(resume, occupation);
		const restored = parseBackup(text);
		expect(restored).toEqual({ format: 'resumesmith-backup', version: BACKUP_VERSION, resume, occupation });
		expect(text).not.toContain('customTemplate');
	});

	it('rejects unsupported versions, missing or extra nested fields, invalid values and duplicate IDs', () => {
		const base = JSON.parse(createBackup(filledResume(), occupation));
		for (const change of [
			(v: typeof base) => {
				v.version = 2;
			},
			(v: typeof base) => {
				delete v.resume.personalInfo.email;
			},
			(v: typeof base) => {
				v.resume.personalInfo.secret = 'unexpected';
			},
			(v: typeof base) => {
				v.resume.education[0].isPresent = 'yes';
			},
			(v: typeof base) => {
				v.resume.publications[0].status = 'draft';
			},
			(v: typeof base) => {
				v.resume.workExperience[0].startDate = '2024-13';
			},
			(v: typeof base) => {
				v.resume.fonts.baseSize = 999;
			},
			(v: typeof base) => {
				v.resume.education[0].id = v.resume.projects[0].id;
			},
			(v: typeof base) => {
				v.resume.sectionOrder.push('profile');
			},
			(v: typeof base) => {
				v.occupation.brightOutlook = 'true';
			},
		]) {
			const candidate = structuredClone(base);
			change(candidate);
			expect(() => parseBackup(JSON.stringify(candidate))).toThrow();
		}
		expect(() => parseBackup('{bad json')).toThrow(/valid JSON/);
	});

	it('checks the UTF-8 byte limit before parsing or reading a file', async () => {
		expect(() => parseBackup('é'.repeat(MAX_BACKUP_BYTES / 2 + 1))).toThrow(/2 MB/);
		const file = new File(['x'.repeat(MAX_BACKUP_BYTES + 1)], 'backup.json');
		await expect(readBackupFile(file)).rejects.toThrow(/2 MB/);
	});

	it('persists both records, removes an absent occupation, and leaves other storage untouched', () => {
		const store = storage({ other: 'keep', [ONET_STORAGE_KEY]: 'old' });
		const backup = parseBackup(createBackup(filledResume(), null));
		persistBackup(backup, store);
		expect(JSON.parse(store.getItem('resumeData')!)).toEqual(backup.resume);
		expect(store.getItem(ONET_STORAGE_KEY)).toBeNull();
		expect(store.getItem('other')).toBe('keep');
	});

	it('rolls back when the second storage write is denied, before in-memory state changes', () => {
		const store = storage({ resumeData: 'old resume', [ONET_STORAGE_KEY]: 'old occupation' });
		const originalSet = store.setItem;
		let failed = false;
		store.setItem = (key, value) => {
			if (key === ONET_STORAGE_KEY && !failed) {
				failed = true;
				throw new Error('quota');
			}
			originalSet(key, value);
		};
		expect(() => persistBackup(parseBackup(createBackup(filledResume(), occupation)), store)).toThrow(
			/current resume remains open/,
		);
		expect(store.getItem('resumeData')).toBe('old resume');
		expect(store.getItem(ONET_STORAGE_KEY)).toBe('old occupation');
	});
});
