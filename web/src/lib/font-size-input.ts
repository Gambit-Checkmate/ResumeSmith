import { FONT_SIZE_BOUNDS } from './fonts';
import { defaultFontSettings, type FontSettings } from './types';

export type FontSizeDraft =
	/** Parsed and inside the bounds: safe to apply to the live document. */
	| { status: 'valid'; value: number }
	/** A number outside the bounds: not safe to apply while typing, clamped on commit. */
	| { status: 'out-of-range'; value: number }
	/** Empty or not a plain decimal number: never applied, restored on commit. */
	| { status: 'invalid' };

// Plain unsigned decimals only. Rejects signs, exponents, hex, and "Infinity", which Number() would accept.
const PLAIN_DECIMAL = /^(\d+\.?\d*|\.\d+)$/;

/** Round to the 0.1 pt precision the steppers and the generator use. */
function roundToTenth(value: number): number {
	return Math.abs(value) > Number.MAX_SAFE_INTEGER / 10 ? value : Math.round(value * 10) / 10;
}

/** Formats a stored size for an input, falling back to the default for non-finite data. */
export function formatFontSize(value: number, key: keyof FontSettings): string {
	return String(Number.isFinite(value) ? roundToTenth(value) : defaultFontSettings[key]);
}

/** Classifies text typed into a size field, never returning a value that is not a finite number. */
export function parseFontSizeDraft(text: string, key: keyof FontSettings): FontSizeDraft {
	const cleaned = text
		.trim()
		.replace(/\s*pt$/i, '')
		.replace(',', '.');
	if (!PLAIN_DECIMAL.test(cleaned)) return { status: 'invalid' };
	const parsed = Number(cleaned);
	if (!Number.isFinite(parsed)) return { status: 'invalid' };
	const value = roundToTenth(parsed);
	const [min, max] = FONT_SIZE_BOUNDS[key];
	return value >= min && value <= max ? { status: 'valid', value } : { status: 'out-of-range', value };
}

/** Resolves a draft at a commit boundary (blur or Enter): clamp out-of-range numbers, restore the rest. */
export function commitFontSizeDraft(
	text: string,
	key: keyof FontSettings,
	current: number,
): { value: number; outcome: 'accepted' | 'clamped' | 'restored' } {
	const draft = parseFontSizeDraft(text, key);
	const [min, max] = FONT_SIZE_BOUNDS[key];
	if (draft.status === 'valid') return { value: draft.value, outcome: 'accepted' };
	if (draft.status === 'out-of-range') {
		return { value: Math.min(max, Math.max(min, draft.value)), outcome: 'clamped' };
	}
	const restored = Number.isFinite(current)
		? Math.min(max, Math.max(min, roundToTenth(current)))
		: defaultFontSettings[key];
	return { value: restored, outcome: 'restored' };
}
