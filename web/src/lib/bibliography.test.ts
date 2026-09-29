import { describe, it, expect } from 'vitest';
import {
	bibliographyMarkup,
	compileErrorMessage,
	isBibliography,
	MAX_BIBLIOGRAPHY_BYTES,
	validateBibliographySource,
} from './bibliography';

const SOURCE = '@article{a,\n  title={A Paper},\n  author={Doe, Jane},\n  year={2020}\n}\n';

describe('validateBibliographySource', () => {
	it('accepts a .bib file with entries', () => {
		expect(validateBibliographySource('refs.BIB', SOURCE)).toBeNull();
	});

	it('rejects other extensions, oversized files, and files without entries', () => {
		expect(validateBibliographySource('refs.txt', SOURCE)).toContain('.bib');
		expect(validateBibliographySource('refs.bib', `${SOURCE}${'x'.repeat(MAX_BIBLIOGRAPHY_BYTES)}`)).toContain(
			'256 KB',
		);
		expect(validateBibliographySource('refs.bib', 'just some text')).toContain('entries');
		expect(validateBibliographySource('refs.bib', '')).toContain('entries');
	});
});

describe('isBibliography', () => {
	it('accepts a well-formed stored value and rejects anything else', () => {
		expect(isBibliography({ name: 'refs.bib', source: SOURCE, style: 'ieee' })).toBe(true);
		expect(isBibliography({ name: 'refs.bib', source: SOURCE, style: 'harvard' })).toBe(false);
		expect(isBibliography({ name: 'refs.bib', style: 'apa' })).toBe(false);
		expect(isBibliography(null)).toBe(false);
	});
});

describe('bibliographyMarkup', () => {
	it('embeds the file as an escaped string, keeping its line structure', () => {
		const markup = bibliographyMarkup({ name: 'refs.bib', source: 'a"b\\c\n% note\n', style: 'mla' });
		expect(markup).toBe('#bibliography(bytes("a\\"b\\\\c\\n% note\\n"), title: none, full: true, style: "mla")');
	});

	it('cannot break out of the string', () => {
		const markup = bibliographyMarkup({ name: 'refs.bib', source: '") #panic("x', style: 'apa' });
		expect(markup).toContain('bytes("\\") #panic(\\"x")');
	});

	it('falls back to APA for an unknown style', () => {
		expect(bibliographyMarkup({ name: 'r.bib', source: SOURCE, style: '"); #panic(' as never })).toContain(
			'style: "apa"',
		);
	});
});

describe('compileErrorMessage', () => {
	it('extracts the message from a Typst diagnostic', () => {
		const raw =
			'[SourceDiagnostic { severity: Error, span: Span(1), message: "failed to parse BibLaTeX (expected comma at 1:22)", trace: [] }]';
		expect(compileErrorMessage(new Error(raw))).toBe('failed to parse BibLaTeX (expected comma at 1:22)');
		expect(compileErrorMessage('plain failure')).toBe('plain failure');
	});
});
