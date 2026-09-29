import { describe, it, expect } from 'vitest';
import { CV_SCHEMA, validateExtractedCv } from './cv-extraction';
import { RESUME_SCHEMA } from './extraction';
import { defaultResumeData } from '$lib/types';

function valid() {
	return {
		personalInfo: { ...defaultResumeData.personalInfo },
		profile: { summary: '' },
		education: [],
		workExperience: [],
		skills: [],
		achievements: [],
		publications: [
			{
				title: 'T',
				authors: 'A',
				venue: 'V',
				date: '2020',
				url: '',
				volume: '1',
				issue: '2',
				pages: '3',
				doi: '10.1234/x',
				status: 'in press',
			},
		],
		presentations: [{ title: 'Talk', event: 'E', location: 'L', date: '', kind: 'poster', url: '' }],
		customSections: [{ heading: 'Grants', entries: [{ title: 'G', date: '2019 - 2022', bullets: ['b'] }] }],
	};
}

describe('CV extraction schema', () => {
	it('requires every property it declares, as strict structured output demands', () => {
		const check = (schema: { type?: string; properties?: object; required?: readonly string[]; items?: unknown }) => {
			if (schema.type === 'object')
				expect([...(schema.required ?? [])].sort()).toEqual(Object.keys(schema.properties!).sort());
			for (const child of Object.values(schema.properties ?? {})) check(child);
			if (schema.items) check(schema.items as never);
		};
		check(CV_SCHEMA as never);
	});

	it('leaves the resume schema without CV-only sections', () => {
		expect(RESUME_SCHEMA.required).not.toContain('presentations');
		expect(RESUME_SCHEMA.required).not.toContain('customSections');
		expect(Object.keys(RESUME_SCHEMA.properties.publications.items.properties)).toEqual([
			'title',
			'authors',
			'venue',
			'date',
			'url',
		]);
	});
});

describe('validateExtractedCv', () => {
	it('accepts a complete part', () => {
		expect(validateExtractedCv(valid())).not.toBeNull();
	});

	it.each([
		['a non-object', null],
		['a missing section', { ...valid(), presentations: undefined }],
		[
			'an unknown publication status',
			{ ...valid(), publications: [{ ...valid().publications[0], status: 'retracted' }] },
		],
		['an unknown presentation kind', { ...valid(), presentations: [{ ...valid().presentations[0], kind: 'keynote' }] }],
		[
			'a non-string bullet',
			{ ...valid(), customSections: [{ heading: 'G', entries: [{ title: 'x', date: '', bullets: [1] }] }] },
		],
		['a custom section without a heading', { ...valid(), customSections: [{ entries: [] }] }],
		['a missing publication field', { ...valid(), publications: [{ ...valid().publications[0], doi: undefined }] }],
	])('rejects %s', (_label, value) => {
		expect(validateExtractedCv(value)).toBeNull();
	});
});
