import {
	MAX_DOCUMENT_BYTES,
	MAX_EXTRACTED_TEXT_CHARS,
	MAX_PDF_PAGES,
	SUPPORTED_DOCUMENT_EXTENSIONS,
	extensionOf,
	measureDocumentQuality,
	type DocumentMetrics,
	type ExtractionMethod,
} from './document-quality';

const MIN_TEXT_WORDS_PER_PDF_PAGE = 15;
const MAX_OCR_PAGES = 4;
const OCR_SCALE = 1.6;

export interface PreflightResult {
	filename: string;
	text: string;
	metrics: DocumentMetrics;
	preview: string;
}

export interface PreflightProgress {
	stage: 'extracting' | 'ocr';
	progress: number;
	message: string;
}

type ProgressHandler = (progress: PreflightProgress) => void;

function normalizeText(text: string): string {
	return text
		.replace(/\u0000/gu, '')
		.replace(/[ \t]+\n/gu, '\n')
		.replace(/\n{3,}/gu, '\n\n')
		.trim();
}

function wordCount(text: string): number {
	return text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

async function extractDocx(file: File): Promise<string> {
	const mammoth = await import('mammoth');
	return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
}

async function extractPdf(
	file: File,
	onProgress: ProgressHandler | undefined,
	maxPages: number,
): Promise<{
	text: string;
	method: ExtractionMethod;
	pageCount: number;
	textPages: number;
	ocrPages: number;
	ocrAverageConfidence: number | null;
}> {
	const [pdfjs, workerModule] = await Promise.all([
		import('pdfjs-dist'),
		import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
	const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
	const pdf = await loadingTask.promise;
	if (pdf.numPages > maxPages) throw new Error(`PDFs are limited to ${maxPages} pages.`);

	const pageTexts: string[] = [];
	const ocrCandidates: number[] = [];
	for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
		onProgress?.({
			stage: 'extracting',
			progress: pageNumber / pdf.numPages,
			message: `Extracting text from page ${pageNumber} of ${pdf.numPages}...`,
		});
		const page = await pdf.getPage(pageNumber);
		const content = await page.getTextContent();
		const text = normalizeText(
			content.items.map((item) => ('str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '')).join(''),
		);
		pageTexts.push(text);
		if (wordCount(text) < MIN_TEXT_WORDS_PER_PDF_PAGE) ocrCandidates.push(pageNumber);
		page.cleanup();
	}

	let ocrPages = 0;
	const confidences: number[] = [];
	if (ocrCandidates.length) {
		if (ocrCandidates.length > MAX_OCR_PAGES) {
			await loadingTask.destroy();
			throw new Error(
				`This PDF needs OCR on more than ${MAX_OCR_PAGES} pages. Upload a shorter PDF or a DOCX/TXT copy.`,
			);
		}

		const { createWorker } = await import('tesseract.js');
		const worker = await createWorker('eng', 1, {
			logger: (message) => {
				if (message.status === 'recognizing text') {
					onProgress?.({ stage: 'ocr', progress: message.progress, message: 'Reading scanned text with OCR...' });
				}
			},
		});
		try {
			for (const pageNumber of ocrCandidates) {
				const page = await pdf.getPage(pageNumber);
				const viewport = page.getViewport({ scale: OCR_SCALE });
				const canvas = document.createElement('canvas');
				canvas.width = Math.ceil(viewport.width);
				canvas.height = Math.ceil(viewport.height);
				const canvasContext = canvas.getContext('2d', { alpha: false });
				if (!canvasContext) throw new Error('This browser cannot prepare a PDF page for OCR.');
				await page.render({ canvas, canvasContext, viewport }).promise;
				const result = await worker.recognize(canvas);
				const ocrText = normalizeText(result.data.text);
				if (wordCount(ocrText) > wordCount(pageTexts[pageNumber - 1])) pageTexts[pageNumber - 1] = ocrText;
				confidences.push(result.data.confidence);
				ocrPages += 1;
				page.cleanup();
			}
		} finally {
			await worker.terminate();
		}
	}

	const pageCount = pdf.numPages;
	await loadingTask.destroy();
	return {
		text: pageTexts.join('\n\n'),
		method: ocrPages === 0 ? 'text' : ocrPages === pageCount ? 'ocr' : 'hybrid',
		pageCount,
		textPages: pageCount - ocrPages,
		ocrPages,
		ocrAverageConfidence: confidences.length
			? confidences.reduce((total, confidence) => total + confidence, 0) / confidences.length
			: null,
	};
}

/** Extracts document text locally, applying OCR only to PDF pages without a usable text layer. */
export async function preflightDocument(
	file: File,
	onProgress?: ProgressHandler,
	{ maxPdfPages = MAX_PDF_PAGES }: { maxPdfPages?: number } = {},
): Promise<PreflightResult> {
	if (file.size > MAX_DOCUMENT_BYTES) throw new Error('File is too large (max 5 MB).');
	const extension = extensionOf(file.name);
	if (!SUPPORTED_DOCUMENT_EXTENSIONS.includes(extension as (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number])) {
		throw new Error('Unsupported file. Upload a PDF, DOCX, or TXT.');
	}

	const startedAt = performance.now();
	let extracted: {
		text: string;
		method: ExtractionMethod;
		pageCount: number;
		textPages: number;
		ocrPages: number;
		ocrAverageConfidence: number | null;
	};
	if (extension === 'pdf') {
		extracted = await extractPdf(file, onProgress, maxPdfPages);
	} else {
		onProgress?.({ stage: 'extracting', progress: 0.5, message: 'Extracting document text...' });
		const text = normalizeText(extension === 'docx' ? await extractDocx(file) : await file.text());
		extracted = {
			text,
			method: 'text',
			pageCount: 1,
			textPages: 1,
			ocrPages: 0,
			ocrAverageConfidence: null,
		};
	}

	const text = normalizeText(extracted.text);
	if (text.length > MAX_EXTRACTED_TEXT_CHARS) throw new Error('The extracted document is too long to process.');
	const metrics = measureDocumentQuality(text, {
		...extracted,
		durationMs: performance.now() - startedAt,
	});
	return {
		filename: file.name,
		text,
		metrics,
		preview: text.slice(0, 900),
	};
}
