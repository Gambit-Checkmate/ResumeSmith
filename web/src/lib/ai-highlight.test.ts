import { describe, it, expect, beforeEach } from 'vitest';
import { aiFilled, setHighlightsFromData, clearHighlight, resetHighlights } from './ai-highlight';
import { defaultResumeData } from './types';
import { buildResumeFromExtraction } from './resume-utils';
import type { ExtractedResume } from './types';

const sample: ExtractedResume = {
	personalInfo: {
		name: 'Ada',
		phone: '',
		location: 'London',
		email: 'ada@example.com',
		website: '',
		linkedin: '',
		github: '',
	},
	profile: { summary: 'Math.' },
	education: [],
	projects: [],
	workExperience: [
		{
			title: 'Engineer',
			company: 'Acme',
			location: '',
			startDate: '2020-01',
			endDate: '',
			isPresent: true,
			bullets: ['Did a thing', ''],
		},
	],
	leadership: [],
	skills: [{ category: 'Lang', skills: 'TS' }],
	achievements: [],
	publications: [],
	clearance: [{ level: 'Secret', status: 'Active', dateGranted: '2022-06' }],
};

describe('setHighlightsFromData', () => {
	beforeEach(() => resetHighlights());

	it('marks populated string fields', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('personalInfo.name')).toBe(true);
		expect(aiFilled.has('profile.summary')).toBe(true);
	});

	it('does not mark empty string fields', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('personalInfo.phone')).toBe(false);
	});

	it('marks nested array item fields with indices', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('workExperience.0.title')).toBe(true);
		expect(aiFilled.has('skills.0.category')).toBe(true);
	});

	it('marks clearance fields', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('clearance.0.level')).toBe(true);
		expect(aiFilled.has('clearance.0.status')).toBe(true);
		expect(aiFilled.has('clearance.0.dateGranted')).toBe(true);
	});

	it('marks only non-empty bullets by index', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('workExperience.0.bullets.0')).toBe(true);
		expect(aiFilled.has('workExperience.0.bullets.1')).toBe(false);
	});

	it('never marks id or boolean fields', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		expect(aiFilled.has('workExperience.0.id')).toBe(false);
		expect(aiFilled.has('workExperience.0.isPresent')).toBe(false);
	});

	it('clearHighlight removes a single path', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		clearHighlight('personalInfo.name');
		expect(aiFilled.has('personalInfo.name')).toBe(false);
	});

	it('resetHighlights empties the set', () => {
		setHighlightsFromData(buildResumeFromExtraction(sample));
		resetHighlights();
		expect(aiFilled.size).toBe(0);
	});
});

describe('custom section highlights', () => {
	it('marks the heading, entry fields, and bullets using the form paths', () => {
		setHighlightsFromData({
			...structuredClone(defaultResumeData),
			customSections: [
				{ id: 's', heading: 'Grants', entries: [{ id: 'e', title: 'Grant', date: '', bullets: ['', 'Detail'] }] },
			],
		});
		expect(aiFilled.has('customSections.0.heading')).toBe(true);
		expect(aiFilled.has('customSections.0.entries.0.title')).toBe(true);
		expect(aiFilled.has('customSections.0.entries.0.date')).toBe(false);
		expect(aiFilled.has('customSections.0.entries.0.bullets.1')).toBe(true);
		expect(aiFilled.has('customSections.0.entries.0.bullets.0')).toBe(false);
	});
});
