import { describe, it, expect } from 'vitest';
import { authorMarkup, citationMarkup, isPublicationStatus, normalizeDoi, publicationLinks } from './publication';
import type { Publication } from './types';

const paper: Publication = {
	id: 'p',
	title: 'A Paper',
	authors: 'Doe, J.',
	venue: '',
	date: '',
	url: '',
	volume: '',
	issue: '',
	pages: '',
	doi: '',
	status: 'published',
};

describe('normalizeDoi', () => {
	it('accepts bare, prefixed, and resolver-URL DOIs', () => {
		expect(normalizeDoi('10.1234/abc.def')).toBe('10.1234/abc.def');
		expect(normalizeDoi(' doi: 10.1234/abc ')).toBe('10.1234/abc');
		expect(normalizeDoi('https://doi.org/10.1234/abc')).toBe('10.1234/abc');
		expect(normalizeDoi('http://dx.doi.org/10.1234/(abc)-1')).toBe('10.1234/(abc)-1');
	});

	it('rejects values that are not DOIs', () => {
		for (const value of [
			'',
			'10.12/abc',
			'11.1234/abc',
			'10.1234/a b',
			'javascript:alert(1)',
			'https://example.com/10.1234/x',
		]) {
			expect(normalizeDoi(value)).toBe('');
		}
	});
});

describe('authorMarkup', () => {
	it('bolds every occurrence of the owner name', () => {
		expect(authorMarkup('Doe, J., Roe, R., Doe, J.', 'Doe, J.')).toBe('#strong[Doe, J.], Roe, R., #strong[Doe, J.]');
	});

	it('treats the owner name literally rather than as a pattern', () => {
		expect(authorMarkup('A.B., AxB', 'A.B')).toBe('#strong[A.B]., AxB');
	});

	it('only escapes when no owner name is set', () => {
		expect(authorMarkup('Doe, J. [ed]', ' ')).toBe('Doe, J. \\[ed\\]');
	});
});

describe('publicationLinks', () => {
	it('does not repeat a URL that points at the same DOI', () => {
		expect(publicationLinks({ doi: '10.1234/x', url: 'https://doi.org/10.1234/x' })).toEqual([
			'#link("https://doi.org/10.1234/x")[doi:10.1234\\/x]',
		]);
		expect(publicationLinks({ doi: '10.1234/x', url: 'example.com' })).toHaveLength(2);
	});
});

describe('citationMarkup', () => {
	it('uses the year for published work and the status otherwise', () => {
		expect(citationMarkup({ ...paper, date: '2020-04' }, '')).toBe('Doe, J. (2020). A Paper.');
		expect(citationMarkup({ ...paper, date: '2020', status: 'under review' }, '')).toBe(
			'Doe, J. (under review). A Paper.',
		);
	});

	it('handles missing authors and dates', () => {
		expect(citationMarkup({ ...paper, authors: '' }, '')).toBe('A Paper.');
		expect(citationMarkup({ ...paper, authors: '', status: 'in press' }, '')).toBe('(in press). A Paper.');
		expect(citationMarkup(paper, '')).toBe('Doe, J. A Paper.');
	});

	it('treats an unknown status as published', () => {
		expect(citationMarkup({ ...paper, date: '2020', status: 'retracted' as never }, '')).toBe(
			'Doe, J. (2020). A Paper.',
		);
		expect(isPublicationStatus('retracted')).toBe(false);
	});
});
