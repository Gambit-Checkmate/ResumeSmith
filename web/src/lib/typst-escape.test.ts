import { describe, it, expect } from 'vitest';
import { typstTextString, typstString, typstMarkup, typstNumber, typstColor, typstUrl } from './typst-escape';

describe('typstString', () => {
	it('escapes backslashes and quotes', () => {
		expect(typstString('a\\b"c')).toBe('a\\\\b\\"c');
	});

	it('leaves # and $ alone so they render without stray backslashes', () => {
		expect(typstString('C# and $5')).toBe('C# and $5');
	});

	it('cannot be broken out of by a closing quote', () => {
		expect(typstString('x", evil: 1, y: "')).not.toMatch(/(^|[^\\])"/);
	});

	it('collapses newlines and tabs to single spaces', () => {
		expect(typstString('line one\r\nline\ttwo')).toBe('line one line two');
	});

	it('strips other control characters', () => {
		expect(typstString('a\u0000b\u001fc')).toBe('abc');
	});

	it('returns an empty string for empty input', () => {
		expect(typstString('')).toBe('');
	});
});

describe('typstMarkup', () => {
	it('escapes a closing bracket so content blocks cannot be closed early', () => {
		expect(typstMarkup('done] #sys')).toBe('done\\] \\#sys');
	});

	it('escapes every Typst special character', () => {
		for (const ch of '#$*_`<>@~[]/-+=\'"') {
			expect(typstMarkup(`a${ch}b`)).toBe(`a\\${ch}b`);
		}
	});

	it('encodes a literal backslash as a unicode escape, not as a linebreak', () => {
		expect(typstMarkup('C:\\path')).toBe('C:\\u{5C}path');
	});

	it('collapses newlines to spaces so list structure cannot be broken', () => {
		expect(typstMarkup('first\nsecond')).toBe('first second');
	});

	it('leaves ordinary prose untouched', () => {
		expect(typstMarkup('Built a thing for 3 teams.')).toBe('Built a thing for 3 teams.');
	});

	it('neutralizes a full injection payload', () => {
		const escaped = typstMarkup('safe] #eval("1+1") #[');
		expect(escaped).not.toMatch(/(^|[^\\])[[\]#]/);
	});
});

describe('typstNumber', () => {
	it('passes through an in-range number', () => {
		expect(typstNumber(10.5, 8, 4, 40)).toBe(10.5);
	});

	it('clamps above the maximum', () => {
		expect(typstNumber(500, 8, 4, 40)).toBe(40);
	});

	it('clamps below the minimum', () => {
		expect(typstNumber(0.1, 8, 4, 40)).toBe(4);
	});

	it('falls back when given a non-numeric value', () => {
		expect(typstNumber('9pt); #eval("1+1"); (' as unknown as number, 8, 4, 40)).toBe(8);
	});

	it('falls back on NaN and Infinity', () => {
		expect(typstNumber(NaN, 8, 4, 40)).toBe(8);
		expect(typstNumber(Infinity, 8, 4, 40)).toBe(8);
	});

	it('accepts a numeric string', () => {
		expect(typstNumber('12' as unknown as number, 8, 4, 40)).toBe(12);
	});
});

describe('typstColor', () => {
	it('accepts a six-digit hex colour and normalizes the leading hash', () => {
		expect(typstColor('#1a2B3c', '#000000')).toBe('1a2B3c');
		expect(typstColor('1a2B3c', '#000000')).toBe('1a2B3c');
	});

	it('accepts three and eight digit hex colours', () => {
		expect(typstColor('#abc', '#000000')).toBe('abc');
		expect(typstColor('#aabbccdd', '#000000')).toBe('aabbccdd');
	});

	it('rejects a value carrying an injection payload', () => {
		expect(typstColor('000"); #eval("1+1"); rgb("000', '#123456')).toBe('123456');
	});

	it('rejects named colours and malformed hex', () => {
		expect(typstColor('red', '#123456')).toBe('123456');
		expect(typstColor('#12345', '#123456')).toBe('123456');
	});

	it('falls back on a non-string value', () => {
		expect(typstColor(undefined as unknown as string, '#123456')).toBe('123456');
	});
});

describe('typstUrl', () => {
	it('keeps http, https and mailto URLs', () => {
		expect(typstUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
		expect(typstUrl('http://example.com')).toBe('http://example.com');
		expect(typstUrl('mailto:me@example.com')).toBe('mailto:me@example.com');
	});

	it('assumes https for a bare domain', () => {
		expect(typstUrl('example.com/thing')).toBe('https://example.com/thing');
	});

	it('drops a javascript: URL', () => {
		expect(typstUrl('javascript:alert(1)')).toBe('');
	});

	it('drops a data: URL', () => {
		expect(typstUrl('data:text/html,<script>')).toBe('');
	});

	it('ignores leading whitespace and case when matching the scheme', () => {
		expect(typstUrl('  JavaScript:alert(1)')).toBe('');
	});

	it('returns an empty string for empty input', () => {
		expect(typstUrl('')).toBe('');
	});
});

describe('typstTextString', () => {
	it('keeps line structure as escape sequences and escapes quotes and backslashes', () => {
		expect(typstTextString('a"b\\c\n% x\r\td')).toBe('a\\"b\\\\c\\n% x\\r\\td');
	});

	it('drops other control characters', () => {
		expect(typstTextString('a\u0000b\u007fc')).toBe('abc');
	});
});
