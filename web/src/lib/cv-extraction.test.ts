import { describe, it, expect } from 'vitest';
import {
	buildResumeFromCvExtraction,
	CV_CHUNK_CHARS,
	isHeadingLine,
	MAX_CV_CHUNK_CHARS,
	mergeCvExtractions,
	splitCvText,
	type ExtractedCv,
} from './cv-extraction';
import { defaultResumeData, cvFontSettings } from './types';

function emptyCv(overrides: Partial<ExtractedCv> = {}): ExtractedCv {
	return {
		personalInfo: { ...defaultResumeData.personalInfo },
		profile: { summary: '' },
		education: [],
		workExperience: [],
		skills: [],
		achievements: [],
		publications: [],
		presentations: [],
		customSections: [],
		...overrides,
	};
}

const publication = (title: string) => ({
	title,
	authors: 'Doe, J.',
	venue: 'Journal',
	date: '2020',
	url: '',
	volume: '',
	issue: '',
	pages: '',
	doi: '',
	status: 'published' as const,
});

// Synthetic CV text: a heading followed by many one-line references.
function longCv(sections: number, linesPerSection: number): string {
	const out: string[] = [];
	for (let s = 0; s < sections; s++) {
		out.push(`Section Heading ${String.fromCharCode(65 + s)}`);
		for (let l = 0; l < linesPerSection; l++) {
			out.push(`Doe, J. (2020). Representative reference number ${l} in section ${s}. Journal of Examples, 1(2), 3-4.`);
		}
		out.push('');
	}
	return out.join('\n');
}

describe('isHeadingLine', () => {
	it('recognizes short word-only lines as headings', () => {
		for (const line of ['Publications', 'GRANTS & FUNDING', 'Invited Talks:', 'Teaching / Mentoring']) {
			expect(isHeadingLine(line)).toBe(true);
		}
	});

	it('rejects entries, sentences, and dates', () => {
		for (const line of [
			'Doe, J. (2020). A paper.',
			'2019 - 2022',
			'A',
			'This is a very long line with many words in it',
		]) {
			expect(isHeadingLine(line)).toBe(false);
		}
	});
});

describe('splitCvText', () => {
	it('keeps a short document in one part without context', () => {
		expect(splitCvText('  Publications\nOne line  ')).toEqual([{ text: 'Publications\nOne line', context: '' }]);
		expect(splitCvText('   ')).toEqual([]);
	});

	it('keeps every part within the server limit and loses no text', () => {
		const text = longCv(6, 120);
		const chunks = splitCvText(text);
		expect(chunks.length).toBeGreaterThan(1);
		for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(MAX_CV_CHUNK_CHARS);
		const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
		expect(normalize(chunks.map((chunk) => chunk.text).join('\n'))).toBe(normalize(text));
	});

	it('carries the section heading into a part that starts mid-section', () => {
		const chunks = splitCvText(longCv(1, 300));
		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks[0].context).toBe('');
		for (const chunk of chunks.slice(1)) expect(chunk.context).toBe('Section Heading A');
	});

	it('prefers to break before a heading once a part is mostly full', () => {
		const chunks = splitCvText(longCv(8, 80));
		const startsAtHeading = chunks.slice(1).filter((chunk) => chunk.text.startsWith('Section Heading'));
		expect(startsAtHeading.length).toBeGreaterThan(0);
		for (const chunk of startsAtHeading) expect(chunk.context).toBe('');
	});

	it('folds a short tail into the previous part', () => {
		const text = `${'x '.repeat(CV_CHUNK_CHARS / 2 - 10)}\n${'y '.repeat(CV_CHUNK_CHARS / 2 - 10)}\nshort tail`;
		const chunks = splitCvText(text);
		expect(chunks.at(-1)!.text.endsWith('short tail')).toBe(true);
		expect(chunks.every((chunk) => chunk.text.length >= 1_000)).toBe(true);
	});

	it('hard-splits a single line longer than a part', () => {
		const chunks = splitCvText('z'.repeat(CV_CHUNK_CHARS * 2 + 5_000));
		expect(chunks.length).toBe(3);
		for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(MAX_CV_CHUNK_CHARS);
	});
});

describe('mergeCvExtractions', () => {
	it('takes contact details and the summary from the first part that has them', () => {
		const merged = mergeCvExtractions([
			emptyCv({ personalInfo: { ...defaultResumeData.personalInfo, name: 'Test Person' } }),
			emptyCv({
				personalInfo: { ...defaultResumeData.personalInfo, name: 'Other', email: 'test@example.edu' },
				profile: { summary: 'Summary.' },
			}),
		]);
		expect(merged.personalInfo.name).toBe('Test Person');
		expect(merged.personalInfo.email).toBe('test@example.edu');
		expect(merged.profile.summary).toBe('Summary.');
	});

	it('concatenates lists in order and drops exact repeats', () => {
		const merged = mergeCvExtractions([
			emptyCv({ publications: [publication('A'), publication('B')] }),
			emptyCv({ publications: [publication('B'), publication('C')] }),
		]);
		expect(merged.publications.map((p) => p.title)).toEqual(['A', 'B', 'C']);
	});

	it('joins custom sections that share a heading and drops unnamed ones', () => {
		const entry = (title: string) => ({ title, date: '', bullets: [] });
		const merged = mergeCvExtractions([
			emptyCv({ customSections: [{ heading: 'Grants', entries: [entry('One')] }] }),
			emptyCv({
				customSections: [
					{ heading: ' grants ', entries: [entry('One'), entry('Two')] },
					{ heading: ' ', entries: [entry('Lost')] },
				],
			}),
		]);
		expect(merged.customSections).toEqual([{ heading: 'Grants', entries: [entry('One'), entry('Two')] }]);
	});
});

describe('buildResumeFromCvExtraction', () => {
	it('builds CV data with ids, CV fonts, and custom sections in the order', () => {
		const data = buildResumeFromCvExtraction(
			emptyCv({
				publications: [publication('A')],
				customSections: [{ heading: 'Grants', entries: [{ title: 'G', date: '2020', bullets: ['b'] }] }],
			}),
		);
		expect(data.documentType).toBe('cv');
		expect(data.fonts).toEqual(cvFontSettings);
		expect(data.publications[0].id).toBeTruthy();
		expect(data.customSections[0].entries[0].id).toBeTruthy();
		expect(data.sectionOrder).toContain(`custom:${data.customSections[0].id}`);
		expect(new Set(data.sectionOrder).size).toBe(data.sectionOrder.length);
		expect(data.sectionOrder.indexOf('publications')).toBeLessThan(data.sectionOrder.indexOf('skills'));
		for (const id of defaultResumeData.sectionOrder) expect(data.sectionOrder).toContain(id);
	});
});
