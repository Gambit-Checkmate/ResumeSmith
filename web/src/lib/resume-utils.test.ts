import { describe, it, expect } from 'vitest';
import { buildResumeFromExtraction, estimateOverOnePage, toSingleLine, withDocumentType } from './resume-utils';
import { cvFontSettings, defaultFontSettings, defaultResumeData } from './types';
import type { ExtractedResume, ResumeData } from './types';

const sample: ExtractedResume = {
	personalInfo: { name: '', phone: '', location: '', email: '', website: '', linkedin: '', github: '' },
	profile: { summary: '' },
	education: [],
	projects: [],
	workExperience: [],
	leadership: [],
	skills: [],
	achievements: [],
	publications: [{ title: 'Paper', authors: 'A. Test', venue: 'Journal', date: '2021-04', url: '' }],
	clearance: [{ level: 'Secret', status: 'Active', dateGranted: '2022-06' }],
};

describe('buildResumeFromExtraction clearance handling', () => {
	it('assigns an id to each extracted clearance entry', () => {
		const r = buildResumeFromExtraction(sample);
		expect(r.clearance).toHaveLength(1);
		expect(r.clearance[0].id).toBeTruthy();
		expect(r.clearance[0].level).toBe('Secret');
	});

	it('defaults to an empty clearance array when none is extracted', () => {
		const r = buildResumeFromExtraction({ ...sample, clearance: [] });
		expect(r.clearance).toEqual([]);
	});
});

describe('estimateOverOnePage clearance weight', () => {
	function baseData(): ResumeData {
		return structuredClone(defaultResumeData);
	}

	it('pushes the one-page estimate over the threshold', () => {
		const data = baseData();
		for (let i = 0; i < 55; i++) {
			data.skills.push({ id: `s${i}`, category: 'X', skills: 'Y' });
		}
		expect(estimateOverOnePage(data)).toBe(false);

		data.clearance = [{ id: '1', level: 'Secret', status: 'Active', dateGranted: '' }];
		expect(estimateOverOnePage(data)).toBe(true);
	});
});

describe('toSingleLine', () => {
	it('replaces pasted line breaks with single spaces', () => {
		expect(toSingleLine('Built a\r\nsync engine\n\nfor Entra')).toBe('Built a sync engine for Entra');
	});

	it('leaves single-line text unchanged', () => {
		expect(toSingleLine('Shipped v2')).toBe('Shipped v2');
	});
});

describe('withDocumentType', () => {
	it('moves default resume font sizes to the CV defaults and back', () => {
		const cv = withDocumentType(structuredClone(defaultResumeData), 'cv');
		expect(cv.documentType).toBe('cv');
		expect(cv.fonts).toEqual(cvFontSettings);
		const resume = withDocumentType(cv, 'resume');
		expect(resume.documentType).toBe('resume');
		expect(resume.fonts).toEqual(defaultFontSettings);
	});

	it('keeps font sizes the user changed', () => {
		const data = { ...structuredClone(defaultResumeData), fonts: { ...defaultFontSettings, baseSize: 9.5 } };
		expect(withDocumentType(data, 'cv').fonts).toEqual(data.fonts);
	});

	it('keeps content and returns the same object when the type does not change', () => {
		const data = structuredClone(defaultResumeData);
		data.personalInfo.name = 'Ada';
		expect(withDocumentType(data, 'resume')).toBe(data);
		expect(withDocumentType(data, 'cv').personalInfo.name).toBe('Ada');
	});
});
