export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_EXTRACTED_TEXT_CHARS = 120_000;
export const MAX_PDF_PAGES = 10;
// Academic CVs run longer; the text limit above still bounds what is sent.
export const MAX_CV_PDF_PAGES = 30;
export const SUPPORTED_DOCUMENT_EXTENSIONS = ['pdf', 'docx', 'txt'] as const;

export type ExtractionMethod = 'text' | 'ocr' | 'hybrid';
export type QualityStatus = 'pass' | 'warning' | 'fail';

export interface DocumentMetrics {
	method: ExtractionMethod;
	characterCount: number;
	wordCount: number;
	lineCount: number;
	alphanumericRatio: number;
	replacementCharacterRatio: number;
	pageCount: number;
	textPages: number;
	ocrPages: number;
	ocrAverageConfidence: number | null;
	durationMs: number;
	score: number;
	status: QualityStatus;
	warnings: string[];
}

export interface MetricContext {
	method: ExtractionMethod;
	pageCount?: number;
	textPages?: number;
	ocrPages?: number;
	ocrAverageConfidence?: number | null;
	durationMs?: number;
}

/** Returns the lowercase extension without trusting the file's MIME type. */
export function extensionOf(filename: string): string {
	const index = filename.lastIndexOf('.');
	return index >= 0 ? filename.slice(index + 1).toLowerCase() : '';
}

/** Measures extracted text and assigns a deterministic pass, warning, or fail gate. */
export function measureDocumentQuality(text: string, context: MetricContext): DocumentMetrics {
	const trimmed = text.trim();
	const characters = [...trimmed];
	const nonWhitespaceCount = characters.filter((character) => !/\s/u.test(character)).length;
	const alphanumericCount = characters.filter((character) => /[\p{L}\p{N}]/u.test(character)).length;
	const replacementCount = characters.filter((character) => character === '\uFFFD').length;
	const wordCount = trimmed.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
	const lineCount = trimmed ? trimmed.split(/\r?\n/u).filter((line) => line.trim()).length : 0;
	const alphanumericRatio = nonWhitespaceCount === 0 ? 0 : alphanumericCount / nonWhitespaceCount;
	const replacementCharacterRatio = characters.length === 0 ? 0 : replacementCount / characters.length;
	const confidence = context.ocrAverageConfidence ?? null;
	const warnings: string[] = [];

	const failures: string[] = [];
	if (characters.length < 80 || wordCount < 15) failures.push('Too little readable text was found.');
	if (alphanumericRatio < 0.35) failures.push('The extracted content contains too little readable language.');
	if (replacementCharacterRatio > 0.05) failures.push('Too many characters could not be decoded.');
	if (confidence !== null && confidence < 40) failures.push('OCR confidence is too low.');

	if (characters.length < 300) warnings.push('Only a small amount of text was found.');
	if (wordCount < 50) warnings.push('The document has fewer than 50 readable words.');
	if (alphanumericRatio < 0.55) warnings.push('The extracted text contains an unusual amount of punctuation or noise.');
	if (replacementCharacterRatio > 0.01) warnings.push('Some characters could not be decoded.');
	if (confidence !== null && confidence < 65)
		warnings.push('OCR confidence is below 65%. Review the preview carefully.');

	let score = 100;
	if (characters.length < 300) score -= 20;
	if (wordCount < 50) score -= 20;
	if (alphanumericRatio < 0.55) score -= 20;
	if (replacementCharacterRatio > 0.01) score -= 20;
	if (confidence !== null && confidence < 65) score -= 20;
	if (failures.length) score = Math.min(score, 39);
	const status: QualityStatus = failures.length ? 'fail' : warnings.length ? 'warning' : 'pass';

	return {
		method: context.method,
		characterCount: characters.length,
		wordCount,
		lineCount,
		alphanumericRatio,
		replacementCharacterRatio,
		pageCount: context.pageCount ?? 1,
		textPages: context.textPages ?? (context.method === 'ocr' ? 0 : 1),
		ocrPages: context.ocrPages ?? (context.method === 'ocr' ? 1 : 0),
		ocrAverageConfidence: confidence,
		durationMs: Math.max(0, Math.round(context.durationMs ?? 0)),
		score: Math.max(0, score),
		status,
		warnings: [...failures, ...warnings.filter((warning) => !failures.includes(warning))],
	};
}

/** Applies server-safe validation to text submitted after the browser preflight. */
export function validateExtractedDocument(filename: string, text: string): string | null {
	if (
		!SUPPORTED_DOCUMENT_EXTENSIONS.includes(extensionOf(filename) as (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number])
	) {
		return 'Unsupported file. Upload a PDF, DOCX, or TXT.';
	}
	if (text.length > MAX_EXTRACTED_TEXT_CHARS) return 'The extracted document is too long to process.';
	const metrics = measureDocumentQuality(text, { method: 'text' });
	return metrics.status === 'fail' ? metrics.warnings[0] : null;
}
