// Formatting for publication entries. Every field is untrusted user or AI text, so anything that
// reaches Typst goes through the escaping helpers here, and the DOI is validated rather than escaped
// into a link target.
import type { Publication, PublicationStatus } from './types';
import { typstMarkup, typstString, typstUrl } from './typst-escape';

export const publicationStatuses: PublicationStatus[] = ['published', 'in press', 'under review'];

export const publicationStatusLabels: Record<PublicationStatus, string> = {
	published: 'Published',
	'in press': 'In press',
	'under review': 'Under review',
};

export function isPublicationStatus(value: unknown): value is PublicationStatus {
	return publicationStatuses.includes(value as PublicationStatus);
}

const DOI_PREFIX = /^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i;
// Crossref's recommended pattern for modern DOIs, without whitespace.
const DOI = /^10\.\d{4,9}\/[-._;()/:a-z0-9<>[\]#"'+]+$/i;

/** Returns the bare DOI (e.g. `10.1234/abc`) or an empty string when the value is not a DOI. */
export function normalizeDoi(value: string): string {
	const bare = value.trim().replace(DOI_PREFIX, '');
	return DOI.test(bare) ? bare : '';
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Author list as Typst markup, with every occurrence of the CV owner's name in bold. */
export function authorMarkup(authors: string, ownerName: string): string {
	const name = ownerName.trim();
	if (!name) return typstMarkup(authors);
	return authors
		.split(new RegExp(`(${escapeRegExp(name)})`))
		.map((part, index) => (index % 2 === 1 ? `#strong[${typstMarkup(part)}]` : typstMarkup(part)))
		.join('');
}

/** Venue with volume, issue, and pages in the usual `Venue, 12(3), 45-67` form. */
export function venueMarkup(publication: Pick<Publication, 'venue' | 'volume' | 'issue' | 'pages'>): string {
	const volume = publication.volume.trim();
	const issue = publication.issue.trim();
	const pages = publication.pages.trim();
	const parts: string[] = [];
	if (publication.venue.trim()) parts.push(`_${typstMarkup(publication.venue.trim())}_`);
	if (volume || issue) parts.push(`${typstMarkup(volume)}${issue ? `(${typstMarkup(issue)})` : ''}`);
	if (pages) parts.push(typstMarkup(pages));
	return parts.join(', ');
}

/** Links to the DOI when valid, and to the URL when it is safe and not the same DOI again. */
export function publicationLinks(publication: Pick<Publication, 'doi' | 'url'>): string[] {
	const links: string[] = [];
	const doi = normalizeDoi(publication.doi);
	if (doi) links.push(`#link("${typstString(`https://doi.org/${doi}`)}")[doi:${typstMarkup(doi)}]`);
	const url = typstUrl(publication.url);
	if (url && !(doi && normalizeDoi(url) === doi)) links.push(`#link("${typstString(url)}")`);
	return links;
}

function year(date: string): string {
	return /^(\d{4})(?:-\d{1,2})?$/.exec(date.trim())?.[1] ?? '';
}

function sentence(markup: string): string {
	return /[.?!]$/.test(markup) ? markup : `${markup}.`;
}

/** One reference in author-date style: `Authors (Year). Title. Venue, 12(3), 45-67. doi:...` */
export function citationMarkup(publication: Publication, ownerName: string): string {
	const status = isPublicationStatus(publication.status) ? publication.status : 'published';
	const when = status === 'published' ? year(publication.date) : status;
	const parts: string[] = [];
	const authors = publication.authors.trim();
	if (authors)
		parts.push(when ? `${authorMarkup(authors, ownerName)} (${when}).` : sentence(authorMarkup(authors, ownerName)));
	else if (when) parts.push(`(${when}).`);
	parts.push(sentence(typstMarkup(publication.title.trim())));
	const venue = venueMarkup(publication);
	if (venue) parts.push(`${venue}.`);
	parts.push(...publicationLinks(publication));
	return parts.join(' ');
}
