// Escaping helpers for user-supplied data that gets interpolated into generated Typst source.
// Typst string literals and Typst markup have different escaping rules, so they get different
// functions. Values that land in code position (numbers, colours) are validated, never escaped.

const TAB = 0x09;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;
const SPACE = 0x20;
const DELETE = 0x7f;

// Line breaks and tabs collapse to a single space; other control characters are dropped.
function normalize(value: string): string {
	let out = '';
	let pendingBreak = false;
	for (const ch of value) {
		const code = ch.codePointAt(0) ?? 0;
		if (code === TAB || (code >= LINE_FEED && code <= CARRIAGE_RETURN)) {
			pendingBreak = true;
			continue;
		}
		if (code < SPACE || code === DELETE) continue;
		if (pendingBreak) {
			out += ' ';
			pendingBreak = false;
		}
		out += ch;
	}
	return out;
}

/** Escapes a value for use inside a Typst string literal, e.g. `#work-heading("<here>", ...)`. */
export function typstString(value: string): string {
	return normalize(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Escapes a multi-line value for a Typst string literal while keeping its line structure, for
 * embedded files such as BibTeX, where a `%` comment runs to the end of its line.
 */
export function typstTextString(value: string): string {
	let out = '';
	for (const ch of value) {
		const code = ch.codePointAt(0) ?? 0;
		if (ch === '\\') out += '\\\\';
		else if (ch === '"') out += '\\"';
		else if (code === LINE_FEED) out += '\\n';
		else if (code === CARRIAGE_RETURN) out += '\\r';
		else if (code === TAB) out += '\\t';
		else if (code < SPACE || code === DELETE) continue;
		else out += ch;
	}
	return out;
}

const MARKUP_SPECIAL = /[\\#$*_`<>@~[\]/\-+='"]/g;

/** Escapes a value for use in Typst markup, e.g. a bullet or the profile summary. */
export function typstMarkup(value: string): string {
	// `\\` is a linebreak in markup rather than a literal backslash, so backslash needs a codepoint escape.
	return normalize(value).replace(MARKUP_SPECIAL, (ch) => (ch === '\\' ? '\\u{5C}' : `\\${ch}`));
}

/** Validates a value destined for code position (font sizes), clamping it into a sane range. */
export function typstNumber(value: number, fallback: number, min: number, max: number): number {
	const raw: unknown = value;
	const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
	if (!Number.isFinite(parsed)) return fallback;
	return Math.min(Math.max(parsed, min), max);
}

const HEX_COLOR = /^([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Validates a hex colour, returning the digits without a leading `#`. */
export function typstColor(value: string, fallback: string): string {
	const digits = typeof value === 'string' ? value.trim().replace(/^#/, '') : '';
	if (HEX_COLOR.test(digits)) return digits;
	return fallback.trim().replace(/^#/, '');
}

const ALLOWED_SCHEME = /^(https?|mailto):/i;
const ANY_SCHEME = /^[a-z][a-z0-9+-]*:/i;

/** Restricts a link target to http/https/mailto, assuming https for a bare domain. */
export function typstUrl(value: string): string {
	const url = typeof value === 'string' ? normalize(value).trim() : '';
	if (!url) return '';
	if (ALLOWED_SCHEME.test(url)) return url;
	if (ANY_SCHEME.test(url)) return '';
	return `https://${url}`;
}
