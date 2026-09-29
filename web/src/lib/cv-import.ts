// Drives a chunked CV extraction from the browser. Parts run one at a time so a long CV stays inside
// the per-client AI rate limit, a rate-limited part waits for Retry-After, and a failed part is kept
// as a gap that can be retried without discarding the parts that succeeded.
import { MAX_CV_CHUNKS, mergeCvExtractions, splitCvText, type CvChunk, type ExtractedCv } from './cv-extraction';

export const MAX_RATE_LIMIT_RETRIES = 3;
const MAX_RETRY_WAIT_MS = 60_000;
const DEFAULT_RETRY_WAIT_MS = 10_000;
const FALLBACK_ERROR = "Can't reach the AI service. Check your connection and retry.";

export interface CvImportState {
	chunks: CvChunk[];
	results: (ExtractedCv | null)[];
	errors: (string | null)[];
}

export interface CvImportRequest {
	filename: string;
	metrics: unknown;
}

export interface CvImportDependencies {
	fetch: typeof fetch;
	wait: (ms: number) => Promise<void>;
	onProgress?: (message: string) => void;
}

/** Splits the text into parts, refusing a document that would need more parts than the server accepts. */
export function startCvImport(text: string): CvImportState {
	const chunks = splitCvText(text);
	if (chunks.length === 0) throw new Error('No text was found to import.');
	if (chunks.length > MAX_CV_CHUNKS) throw new Error('This CV is too long to import. Try a shorter file.');
	return { chunks, results: chunks.map(() => null), errors: chunks.map(() => null) };
}

function retryDelay(response: Response): number {
	const seconds = Number(response.headers.get('retry-after'));
	return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_RETRY_WAIT_MS) : DEFAULT_RETRY_WAIT_MS;
}

async function errorMessage(response: Response): Promise<string> {
	try {
		const body = await response.json();
		if (typeof body?.error?.message === 'string') return body.error.message;
	} catch {
		// Keep the fallback when the platform returns a non-JSON error page.
	}
	return FALLBACK_ERROR;
}

async function extractPart(
	state: CvImportState,
	index: number,
	request: CvImportRequest,
	deps: CvImportDependencies,
): Promise<ExtractedCv> {
	const chunk = state.chunks[index];
	const label = `part ${index + 1} of ${state.chunks.length}`;
	for (let attempt = 0; ; attempt++) {
		deps.onProgress?.(`Structuring ${label} with AI...`);
		const response = await deps.fetch('/api/extract', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				filename: request.filename,
				text: chunk.text,
				metrics: request.metrics,
				documentType: 'cv',
				part: { index, total: state.chunks.length, context: chunk.context },
			}),
		});
		if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
			const delay = retryDelay(response);
			deps.onProgress?.(`Waiting ${Math.ceil(delay / 1000)} seconds for the AI rate limit before ${label}...`);
			await deps.wait(delay);
			continue;
		}
		if (!response.ok) throw new Error(await errorMessage(response));
		const body = (await response.json()) as { data?: ExtractedCv };
		if (!body?.data) throw new Error(FALLBACK_ERROR);
		return body.data;
	}
}

/** Extracts every part that has no result yet, returning a new state; earlier successes are kept. */
export async function runCvImport(
	state: CvImportState,
	request: CvImportRequest,
	deps: CvImportDependencies,
): Promise<CvImportState> {
	const next: CvImportState = { chunks: state.chunks, results: [...state.results], errors: [...state.errors] };
	for (let index = 0; index < next.chunks.length; index++) {
		if (next.results[index]) continue;
		try {
			next.results[index] = await extractPart(next, index, request, deps);
			next.errors[index] = null;
		} catch (error) {
			next.errors[index] = error instanceof Error ? error.message : FALLBACK_ERROR;
		}
	}
	return next;
}

/** One-based numbers of the parts that still need extracting. */
export function failedParts(state: CvImportState): number[] {
	return state.results.flatMap((result, index) => (result ? [] : [index + 1]));
}

/** The stitched result of every successful part, or null when nothing succeeded. */
export function mergedCv(state: CvImportState): ExtractedCv | null {
	const done = state.results.filter((result): result is ExtractedCv => result !== null);
	return done.length ? mergeCvExtractions(done) : null;
}
