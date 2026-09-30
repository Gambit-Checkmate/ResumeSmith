import { describe, expect, it, vi } from 'vitest';
import { copyResumeText, serializeResumeText } from './resume-text';
import { defaultResumeData, type ResumeData } from './types';

const fresh = (): ResumeData => structuredClone(defaultResumeData);

describe('plain-text resume export', () => {
	it('omits empty content and template syntax', () => {
		expect(serializeResumeText(fresh())).toBe('');
		const data = fresh();
		data.personalInfo.name = 'Zoë Example';
		data.personalInfo.website = 'https://example.test';
		expect(serializeResumeText(data)).toBe('Zoë Example\nhttps://example.test');
		expect(serializeResumeText(data)).not.toMatch(/[#{}]/);
	});

	it('renders every populated section in the selected order with dates, URLs, and bullets', () => {
		const data = fresh();
		data.personalInfo = {
			name: 'Zoë Example',
			email: 'zoe@example.test',
			phone: '+1 555 0100',
			location: 'Zürich',
			website: 'https://example.test',
			linkedin: '',
			github: 'https://github.com/zoe',
		};
		data.profile.summary = 'Builds accessible tools.';
		data.clearance.push({ id: 'c', level: 'Secret', status: 'Active', dateGranted: '2020' });
		data.education.push({
			id: 'e',
			institution: 'Example University',
			location: 'CH',
			degree: 'BSc',
			major: 'CS',
			startDate: '2018',
			endDate: '2022-06',
			isPresent: false,
			bullets: ['Dean’s list'],
		});
		data.projects.push({
			id: 'p',
			name: 'Atlas',
			stack: 'TypeScript',
			url: 'https://atlas.test',
			award: 'First place',
			bullets: ['Built maps'],
		});
		data.workExperience.push({
			id: 'w',
			title: 'Engineer',
			company: 'Acme',
			location: 'Remote',
			startDate: '2023-02',
			endDate: '',
			isPresent: true,
			bullets: ['Shipped features'],
		});
		data.leadership.push({
			id: 'l',
			title: 'Chair',
			organization: 'Club',
			location: 'CH',
			startDate: '2021',
			endDate: '2022',
			isPresent: false,
			bullets: ['Led members'],
		});
		data.skills.push({ id: 's', category: 'Languages', skills: 'English, Français' });
		data.achievements.push({ id: 'a', title: 'Award', date: '2024', description: 'Recognized for service' });
		data.publications.push({
			id: 'u',
			title: 'A Paper',
			authors: 'Z. Example',
			venue: 'Journal',
			date: '2024-03',
			url: 'https://paper.test',
			volume: '2',
			issue: '1',
			pages: '3-7',
			doi: '10.1234/test',
			status: 'published',
		});
		data.presentations.push({
			id: 't',
			title: 'A Talk',
			event: 'Conference',
			location: 'Paris',
			date: '2025',
			kind: 'invited',
			url: 'https://talk.test',
		});
		data.customSections.push({
			id: 'x',
			heading: 'Service',
			entries: [{ id: 'i', title: 'Mentor', date: 'Fall 2023', bullets: ['Helped students'] }],
		});
		data.sectionOrder = [
			'experience',
			'profile',
			'clearance',
			'education',
			'projects',
			'leadership',
			'skills',
			'achievements',
			'publications',
			'presentations',
			'custom:x',
		];

		const text = serializeResumeText(data);
		expect(text).toContain('Zoë Example\nzoe@example.test | +1 555 0100 | Zürich');
		expect(text).toContain('Engineer | Acme | Remote\nFeb 2023 - Present\n- Shipped features');
		expect(text).toContain('2018 - Jun 2022');
		expect(text).toContain('https://atlas.test');
		expect(text).toContain('https://paper.test');
		expect(text).toContain('DOI: 10.1234/test');
		expect(text).toContain('Fall 2023\n- Helped students');
		expect(text).toContain('Secret | Active | 2020');
		expect(text).toContain('English, Français');
		const headings = [
			'Experience',
			'Profile',
			'Clearance',
			'Education',
			'Projects',
			'Leadership',
			'Skills',
			'Achievements',
			'Publications',
			'Presentations',
			'Service',
		];
		expect(headings.map((heading) => text.indexOf(`\n\n${heading}\n`))).toEqual(
			[...headings.map((heading) => text.indexOf(`\n\n${heading}\n`))].sort((a, b) => a - b),
		);
	});

	it('reports clipboard denial without affecting the downloadable text', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('denied'));
		expect(await copyResumeText('resume', { writeText })).toBe(false);
		expect(await copyResumeText('resume', undefined)).toBe(false);
		writeText.mockResolvedValue(undefined);
		expect(await copyResumeText('resume', { writeText })).toBe(true);
	});
});
