import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('./pdf-compiler', () => ({ compileToPdf: vi.fn(async () => new Uint8Array([1])) }));

import { compileToPdf } from './pdf-compiler';
import { BIBLIOGRAPHY_STORAGE_KEY, bibliographyStore, validateBibliography } from './bibliography-store';

const bibliography = { name: 'refs.bib', source: '@misc{a, title={T}}', style: 'apa' as const };

function storage() {
	const values = new Map<string, string>();
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key),
	};
}

describe('bibliography store', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.mocked(compileToPdf).mockClear();
		vi.mocked(compileToPdf).mockResolvedValue(new Uint8Array([1]));
		vi.stubGlobal('window', { localStorage: storage() });
		bibliographyStore.clear();
	});

	it('compiles the bibliography on its own before accepting it', async () => {
		expect(await validateBibliography(bibliography)).toBeNull();
		expect(vi.mocked(compileToPdf).mock.calls[0][0]).toContain('#bibliography(bytes(');
	});

	it('reports the compiler message for a malformed file', async () => {
		vi.mocked(compileToPdf).mockRejectedValueOnce(
			new Error('[SourceDiagnostic { message: "failed to parse BibLaTeX (expected comma at 1:22)" }]'),
		);
		expect(await validateBibliography(bibliography)).toBe(
			'The BibTeX file could not be read: failed to parse BibLaTeX (expected comma at 1:22)',
		);
	});

	it('skips compiling a file that fails the cheap checks', async () => {
		expect(await validateBibliography({ ...bibliography, name: 'refs.txt' })).toContain('.bib');
		expect(compileToPdf).not.toHaveBeenCalled();
	});

	it('saves, restores, and clears the bibliography in local storage', async () => {
		bibliographyStore.save(bibliography);
		expect(JSON.parse(window.localStorage.getItem(BIBLIOGRAPHY_STORAGE_KEY)!)).toEqual(bibliography);
		bibliographyStore.clear();
		expect(window.localStorage.getItem(BIBLIOGRAPHY_STORAGE_KEY)).toBeNull();

		window.localStorage.setItem(BIBLIOGRAPHY_STORAGE_KEY, JSON.stringify(bibliography));
		await bibliographyStore.loadFromStorage();
		expect(get(bibliographyStore)).toEqual(bibliography);
	});

	it('drops a stored bibliography that is malformed or no longer compiles', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		window.localStorage.setItem(BIBLIOGRAPHY_STORAGE_KEY, '{not json');
		await bibliographyStore.loadFromStorage();
		expect(get(bibliographyStore)).toBeNull();
		expect(window.localStorage.getItem(BIBLIOGRAPHY_STORAGE_KEY)).toBeNull();

		window.localStorage.setItem(BIBLIOGRAPHY_STORAGE_KEY, JSON.stringify(bibliography));
		vi.mocked(compileToPdf).mockRejectedValueOnce(new Error('broken'));
		await bibliographyStore.loadFromStorage();
		expect(get(bibliographyStore)).toBeNull();
		expect(window.localStorage.getItem(BIBLIOGRAPHY_STORAGE_KEY)).toBeNull();
	});
});
