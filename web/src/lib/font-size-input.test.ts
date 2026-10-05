import { describe, it, expect } from 'vitest';
import { FONT_SIZE_BOUNDS } from './fonts';
import { commitFontSizeDraft, formatFontSize, parseFontSizeDraft } from './font-size-input';
import { defaultFontSettings, type FontSettings } from './types';

const keys = Object.keys(FONT_SIZE_BOUNDS) as (keyof FontSettings)[];

describe('parseFontSizeDraft', () => {
	it('accepts the bounds and fractional values inside them for every size', () => {
		for (const key of keys) {
			const [min, max] = FONT_SIZE_BOUNDS[key];
			expect(parseFontSizeDraft(String(min), key)).toEqual({ status: 'valid', value: min });
			expect(parseFontSizeDraft(String(max), key)).toEqual({ status: 'valid', value: max });
			expect(parseFontSizeDraft(`${min}.5`, key)).toEqual({ status: 'valid', value: min + 0.5 });
		}
	});

	it('keeps the supported 0.1 pt precision and rounds anything finer', () => {
		expect(parseFontSizeDraft('8.7', 'baseSize')).toEqual({ status: 'valid', value: 8.7 });
		expect(parseFontSizeDraft('8.74', 'baseSize')).toEqual({ status: 'valid', value: 8.7 });
		expect(parseFontSizeDraft('8.75', 'baseSize')).toEqual({ status: 'valid', value: 8.8 });
	});

	it('tolerates a unit suffix, surrounding space, a trailing dot, and a decimal comma', () => {
		expect(parseFontSizeDraft(' 10 pt ', 'baseSize')).toEqual({ status: 'valid', value: 10 });
		expect(parseFontSizeDraft('10PT', 'baseSize')).toEqual({ status: 'valid', value: 10 });
		expect(parseFontSizeDraft('10.', 'baseSize')).toEqual({ status: 'valid', value: 10 });
		expect(parseFontSizeDraft('9,5', 'baseSize')).toEqual({ status: 'valid', value: 9.5 });
	});

	it('flags numbers outside the bounds instead of accepting them', () => {
		expect(parseFontSizeDraft('5.9', 'baseSize')).toEqual({ status: 'out-of-range', value: 5.9 });
		expect(parseFontSizeDraft('14.1', 'baseSize')).toEqual({ status: 'out-of-range', value: 14.1 });
		expect(parseFontSizeDraft('1', 'nameSize')).toEqual({ status: 'out-of-range', value: 1 });
		expect(parseFontSizeDraft('999999999999999999999', 'nameSize').status).toBe('out-of-range');
	});

	it.each([
		'',
		'   ',
		'.',
		'pt',
		'abc',
		'-8',
		'+8',
		'1e1',
		'0x10',
		'Infinity',
		'NaN',
		'8..5',
		'8.5.1',
		'8 5',
		'8pt pt',
	])('rejects %j as invalid', (text) => {
		expect(parseFontSizeDraft(text, 'baseSize')).toEqual({ status: 'invalid' });
	});

	it('rejects a number too long to be finite', () => {
		expect(parseFontSizeDraft('9'.repeat(400), 'baseSize')).toEqual({ status: 'invalid' });
	});

	it('keeps very large finite drafts finite before clamping', () => {
		const draft = parseFontSizeDraft('9'.repeat(308), 'baseSize');
		expect(draft.status).toBe('out-of-range');
		if (draft.status === 'out-of-range') expect(Number.isFinite(draft.value)).toBe(true);
		expect(commitFontSizeDraft('9'.repeat(308), 'baseSize', 10).value).toBe(14);
	});
});

describe('commitFontSizeDraft', () => {
	it('accepts a valid draft', () => {
		expect(commitFontSizeDraft('9.5', 'baseSize', 8.7)).toEqual({ value: 9.5, outcome: 'accepted' });
	});

	it('clamps out-of-range drafts to the nearest bound', () => {
		expect(commitFontSizeDraft('2', 'baseSize', 8.7)).toEqual({ value: 6, outcome: 'clamped' });
		expect(commitFontSizeDraft('50', 'baseSize', 8.7)).toEqual({ value: 14, outcome: 'clamped' });
		expect(commitFontSizeDraft('50', 'nameSize', 20.7)).toEqual({ value: 32, outcome: 'clamped' });
	});

	it('restores the previous value for empty or unparsable drafts', () => {
		expect(commitFontSizeDraft('', 'baseSize', 8.7)).toEqual({ value: 8.7, outcome: 'restored' });
		expect(commitFontSizeDraft('abc', 'headingSize', 16.8)).toEqual({ value: 16.8, outcome: 'restored' });
		expect(commitFontSizeDraft('-3', 'contactSize', 11.2)).toEqual({ value: 11.2, outcome: 'restored' });
	});

	it('restores to a safe in-range value when the stored one is not usable', () => {
		expect(commitFontSizeDraft('', 'baseSize', Number.NaN)).toEqual({
			value: defaultFontSettings.baseSize,
			outcome: 'restored',
		});
		expect(commitFontSizeDraft('', 'baseSize', Number.POSITIVE_INFINITY).value).toBe(defaultFontSettings.baseSize);
		expect(commitFontSizeDraft('', 'baseSize', 99).value).toBe(14);
	});

	it('never returns a non-finite or out-of-bounds value', () => {
		const inputs = ['', 'x', '0', '1e999', '9'.repeat(400), '-1', '7.25', '100', '.5'];
		for (const key of keys) {
			const [min, max] = FONT_SIZE_BOUNDS[key];
			for (const text of inputs) {
				const { value } = commitFontSizeDraft(text, key, Number.NaN);
				expect(Number.isFinite(value)).toBe(true);
				expect(value).toBeGreaterThanOrEqual(min);
				expect(value).toBeLessThanOrEqual(max);
			}
		}
	});
});

describe('formatFontSize', () => {
	it('shows stored sizes without floating-point noise', () => {
		expect(formatFontSize(8.7, 'baseSize')).toBe('8.7');
		expect(formatFontSize(10, 'baseSize')).toBe('10');
		expect(formatFontSize(0.1 + 0.2 + 8, 'baseSize')).toBe('8.3');
	});

	it('falls back to the default for non-finite data', () => {
		expect(formatFontSize(Number.NaN, 'nameSize')).toBe(String(defaultFontSettings.nameSize));
		expect(formatFontSize(Number.POSITIVE_INFINITY, 'baseSize')).toBe(String(defaultFontSettings.baseSize));
	});
});
