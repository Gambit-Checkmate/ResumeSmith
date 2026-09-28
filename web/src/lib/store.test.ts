import { describe, it, expect } from 'vitest';
import { mergeWithDefaults } from './store';
import { defaultResumeData } from './types';

describe('mergeWithDefaults', () => {
	it('fills in fields missing from old saved data (e.g. clearance) with defaults', () => {
		const { clearance, ...withoutClearance } = defaultResumeData;
		const merged = mergeWithDefaults(withoutClearance as Partial<typeof defaultResumeData>);
		expect(merged.clearance).toEqual([]);
	});

	it('adds default font families to data saved before they existed', () => {
		const { fontFamilies, ...withoutFontFamilies } = defaultResumeData;
		const merged = mergeWithDefaults(withoutFontFamilies);
		expect(merged.fontFamilies).toEqual({ heading: 'Libertinus Serif', body: 'Libertinus Serif' });
	});

	it('adds publications to data saved before the section existed', () => {
		const { publications, ...withoutPublications } = defaultResumeData;
		const merged = mergeWithDefaults({
			...withoutPublications,
			sectionOrder: withoutPublications.sectionOrder.filter((id) => id !== 'publications'),
		});
		expect(merged.publications).toEqual([]);
		expect(merged.sectionOrder.at(-1)).toBe('publications');
	});

	it('loads data saved before document types existed as a resume', () => {
		const { documentType, ...legacy } = defaultResumeData;
		expect(mergeWithDefaults(legacy).documentType).toBe('resume');
	});

	it('keeps a saved CV document type and rejects an unknown one', () => {
		expect(mergeWithDefaults({ documentType: 'cv' }).documentType).toBe('cv');
		expect(mergeWithDefaults({ documentType: 'letter' as never }).documentType).toBe('resume');
	});

	it('adds an empty custom section list to data saved before custom sections existed', () => {
		const { customSections, ...legacy } = defaultResumeData;
		const merged = mergeWithDefaults(legacy);
		expect(merged.customSections).toEqual([]);
		expect(merged.sectionOrder).toEqual(defaultResumeData.sectionOrder);
	});

	it('keeps custom sections in their saved order and appends any missing from the order', () => {
		const merged = mergeWithDefaults({
			customSections: [
				{ id: 'a', heading: 'Grants', entries: [] },
				{ id: 'b', heading: 'Teaching', entries: [] },
			],
			sectionOrder: ['custom:b', 'profile', 'custom:gone'] as never,
		});
		expect(merged.sectionOrder[0]).toBe('custom:b');
		expect(merged.sectionOrder[1]).toBe('profile');
		expect(merged.sectionOrder).not.toContain('custom:gone');
		expect(merged.sectionOrder.at(-1)).toBe('custom:a');
	});

	it('repairs or drops malformed custom sections', () => {
		const merged = mergeWithDefaults({
			customSections: [
				{ id: 'a', heading: 7, entries: [{ title: 'Entry', bullets: ['ok', 3], date: null }, 'junk'] },
				{ id: 'a', heading: 'Duplicate', entries: [] },
				{ heading: 'No id', entries: [] },
				null,
			] as never,
		});
		expect(merged.customSections).toHaveLength(1);
		expect(merged.customSections[0].heading).toBe('');
		expect(merged.customSections[0].entries).toEqual([
			{ id: expect.any(String), title: 'Entry', date: '', bullets: ['ok'] },
		]);
		expect(merged.customSections[0].entries[0].id).not.toBe('');
	});

	it('adds citation fields to publications saved before they existed', () => {
		const merged = mergeWithDefaults({
			publications: [
				{ id: 'p', title: 'Paper', authors: 'A', venue: 'V', date: '2020-01', url: '' },
				{ id: 'q', title: 'Other', status: 'retracted', volume: 4 },
			] as never,
		});
		expect(merged.publications[0]).toEqual({
			id: 'p',
			title: 'Paper',
			authors: 'A',
			venue: 'V',
			date: '2020-01',
			url: '',
			volume: '',
			issue: '',
			pages: '',
			doi: '',
			status: 'published',
		});
		expect(merged.publications[1].status).toBe('published');
		expect(merged.publications[1].volume).toBe('');
		expect(merged.publicationAuthorName).toBe('');
	});

	it('preserves fields present in the saved data', () => {
		const saved = { ...defaultResumeData, personalInfo: { ...defaultResumeData.personalInfo, name: 'Ada' } };
		const merged = mergeWithDefaults(saved);
		expect(merged.personalInfo.name).toBe('Ada');
	});

	it('deep-merges nested settings and appends newly introduced sections', () => {
		const merged = mergeWithDefaults({
			personalInfo: { name: 'Ada' } as Partial<
				typeof defaultResumeData.personalInfo
			> as typeof defaultResumeData.personalInfo,
			fonts: { baseSize: 10 } as typeof defaultResumeData.fonts,
			sectionOrder: ['experience', 'profile'],
		});

		expect(merged.personalInfo.name).toBe('Ada');
		expect(merged.personalInfo.github).toBe('');
		expect(merged.fonts.baseSize).toBe(10);
		expect(merged.fonts.nameSize).toBe(defaultResumeData.fonts.nameSize);
		expect(merged.sectionOrder.slice(0, 2)).toEqual(['experience', 'profile']);
		expect(merged.sectionOrder).toContain('clearance');
	});

	it('returns fresh nested defaults rather than shared mutable objects', () => {
		const first = mergeWithDefaults({});
		first.personalInfo.name = 'Changed';
		first.sectionOrder.pop();
		const second = mergeWithDefaults({});

		expect(second.personalInfo.name).toBe('');
		expect(second.sectionOrder).toEqual(defaultResumeData.sectionOrder);
	});
});
