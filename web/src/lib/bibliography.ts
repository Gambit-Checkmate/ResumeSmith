// An optional BibTeX file for the CV, rendered by Typst's own bibliography support instead of a
// citation formatter written here. The file is untrusted: it stays in the browser, is size-limited,
// is embedded as an escaped string, and must compile before it is used.
import { typstTextString } from './typst-escape';

export const MAX_BIBLIOGRAPHY_BYTES = 256 * 1024;
export const MAX_BIBLIOGRAPHY_LABEL = '256 KB';

export type BibliographyStyle = 'apa' | 'chicago-author-date' | 'ieee' | 'mla';

export const bibliographyStyles: BibliographyStyle[] = ['apa', 'chicago-author-date', 'ieee', 'mla'];

export const bibliographyStyleLabels: Record<BibliographyStyle, string> = {
	apa: 'APA',
	'chicago-author-date': 'Chicago (author-date)',
	ieee: 'IEEE',
	mla: 'MLA',
};

export interface Bibliography {
	name: string;
	source: string;
	style: BibliographyStyle;
}

export function isBibliographyStyle(value: unknown): value is BibliographyStyle {
	return bibliographyStyles.includes(value as BibliographyStyle);
}

/** Checks the inexpensive requirements before compiling a bibliography. */
export function validateBibliographySource(name: string, source: string): string | null {
	if (!name.toLowerCase().endsWith('.bib')) return 'Choose a BibTeX (.bib) file.';
	if (new Blob([source]).size > MAX_BIBLIOGRAPHY_BYTES) {
		return `The BibTeX file must be ${MAX_BIBLIOGRAPHY_LABEL} or smaller.`;
	}
	if (!/@\s*[a-z]+\s*[{(]/i.test(source)) return 'The file does not contain any BibTeX entries.';
	return null;
}

/** Shape check for a value read back from storage. */
export function isBibliography(value: unknown): value is Bibliography {
	const candidate = value as Partial<Bibliography> | null;
	return (
		typeof candidate?.name === 'string' &&
		typeof candidate.source === 'string' &&
		isBibliographyStyle(candidate.style) &&
		validateBibliographySource(candidate.name, candidate.source) === null
	);
}

/** Lists every entry in the file; there are no citations in a CV, so `full` is required. */
export function bibliographyMarkup(bibliography: Bibliography): string {
	const style = isBibliographyStyle(bibliography.style) ? bibliography.style : 'apa';
	return `#bibliography(bytes("${typstTextString(bibliography.source)}"), title: none, full: true, style: "${style}")`;
}

/** Pulls the readable message out of a Typst diagnostic dump. */
export function compileErrorMessage(error: unknown): string {
	const detail = error instanceof Error ? error.message : String(error);
	return /message: "((?:[^"\\]|\\.)*)"/.exec(detail)?.[1].replace(/\\"/g, '"') ?? detail;
}
