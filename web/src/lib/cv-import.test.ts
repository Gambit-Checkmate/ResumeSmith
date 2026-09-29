import { describe, it, expect, vi } from 'vitest';
import { failedParts, mergedCv, runCvImport, startCvImport, MAX_RATE_LIMIT_RETRIES } from './cv-import';
import { CV_CHUNK_CHARS, type ExtractedCv } from './cv-extraction';
import { defaultResumeData } from './types';

const text = Array.from({ length: 3 }, (_, part) => `Part ${part} `.repeat(CV_CHUNK_CHARS / 8)).join('\n');

function partData(index: number): ExtractedCv {
	return {
		personalInfo: { ...defaultResumeData.personalInfo, name: index === 0 ? 'Test Person' : '' },
		profile: { summary: '' },
		education: [],
		workExperience: [],
		skills: [],
		achievements: [{ title: `Award ${index}`, date: '', description: '' }],
		publications: [],
		presentations: [],
		customSections: [],
	};
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), { status, headers });

function partIndex(init?: RequestInit): number {
	return JSON.parse(String(init?.body)).part.index;
}

describe('CV import', () => {
	it('refuses empty text', () => {
		expect(() => startCvImport('  ')).toThrow('No text');
	});

	it('sends every part in order with its position and heading context', async () => {
		const state = startCvImport(text);
		expect(state.chunks.length).toBeGreaterThan(1);
		const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
			json(200, { data: partData(partIndex(init)) }),
		);
		const result = await runCvImport(
			state,
			{ filename: 'cv.pdf', metrics: { method: 'text' } },
			{ fetch, wait: async () => {} },
		);

		expect(fetch).toHaveBeenCalledTimes(state.chunks.length);
		fetch.mock.calls.forEach(([, init], index) => {
			const body = JSON.parse(String(init?.body));
			expect(body).toMatchObject({ documentType: 'cv', part: { index, total: state.chunks.length } });
			expect(body.text).toBe(state.chunks[index].text);
		});
		expect(failedParts(result)).toEqual([]);
		const merged = mergedCv(result)!;
		expect(merged.personalInfo.name).toBe('Test Person');
		expect(merged.achievements.map((a) => a.title)).toEqual(state.chunks.map((_, index) => `Award ${index}`));
	});

	it('waits for Retry-After on a rate-limited part, then continues', async () => {
		const state = startCvImport(text);
		let limited = false;
		const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
			if (partIndex(init) === 1 && !limited) {
				limited = true;
				return json(429, { error: { message: 'Too many requests.' } }, { 'retry-after': '42' });
			}
			return json(200, { data: partData(partIndex(init)) });
		});
		const wait = vi.fn(async () => {});
		const result = await runCvImport(state, { filename: 'cv.pdf', metrics: {} }, { fetch, wait });
		expect(wait).toHaveBeenCalledWith(42_000);
		expect(failedParts(result)).toEqual([]);
	});

	it('gives up on a part after repeated rate limits and caps the wait', async () => {
		const state = startCvImport(text);
		const fetch = vi.fn(async () => json(429, { error: { message: 'Too many requests.' } }, { 'retry-after': '600' }));
		const wait = vi.fn(async () => {});
		const result = await runCvImport(state, { filename: 'cv.pdf', metrics: {} }, { fetch, wait });
		expect(wait).toHaveBeenCalledWith(60_000);
		expect(fetch).toHaveBeenCalledTimes(state.chunks.length * (MAX_RATE_LIMIT_RETRIES + 1));
		expect(mergedCv(result)).toBeNull();
		expect(result.errors[0]).toBe('Too many requests.');
	});

	it('keeps successful parts when one fails and retries only the failed part', async () => {
		const state = startCvImport(text);
		const failing = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
			partIndex(init) === 1
				? json(422, { error: { message: "Couldn't read that file." } })
				: json(200, { data: partData(partIndex(init)) }),
		);
		const partial = await runCvImport(
			state,
			{ filename: 'cv.pdf', metrics: {} },
			{ fetch: failing, wait: async () => {} },
		);
		expect(failedParts(partial)).toEqual([2]);
		expect(partial.errors[1]).toBe("Couldn't read that file.");
		expect(mergedCv(partial)!.achievements.map((a) => a.title)).not.toContain('Award 1');

		const retry = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
			json(200, { data: partData(partIndex(init)) }),
		);
		const complete = await runCvImport(
			partial,
			{ filename: 'cv.pdf', metrics: {} },
			{ fetch: retry, wait: async () => {} },
		);
		expect(retry).toHaveBeenCalledTimes(1);
		expect(partIndex(retry.mock.calls[0][1])).toBe(1);
		expect(failedParts(complete)).toEqual([]);
		expect(complete.errors.every((error) => error === null)).toBe(true);
	});

	it('records a network failure or a non-JSON error page as a failed part', async () => {
		const state = startCvImport(text);
		const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
			if (partIndex(init) === 0) throw new TypeError('Failed to fetch');
			return new Response('<html>502</html>', { status: 502 });
		});
		const result = await runCvImport(state, { filename: 'cv.pdf', metrics: {} }, { fetch, wait: async () => {} });
		expect(result.errors[0]).toBe('Failed to fetch');
		expect(result.errors[1]).toContain("Can't reach the AI service");
	});
});
