import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('./pdf-compiler', () => ({ compileToPdf: vi.fn(async () => new Uint8Array([1])) }));

import { compileToPdf } from './pdf-compiler';
import {
	customTemplateStore,
	customTemplateStores,
	templateStorageKey,
	MAX_TEMPLATE_SIZE,
	TEMPLATE_STORAGE_KEY,
	validateTemplateCompatibility,
	validateTemplateSource,
} from './template-store';

const VALID_TEMPLATE = `
#let resume(author-name: "", email: "", phone: "", website: "", linkedin-user-id: "", github-username: "", body) = body
#let work-heading(title, company, location, start-date, end-date, body) = body
#let project-heading(name, stack: "", project-url: "", award: "", body) = body
#let education-heading(institution, location, degree, major, start-date, end-date, body) = body
#let achievement-heading(title, date, body) = body
#let skills(body) = body
// ========== RESUME CONTENT ==========
`;

function storage() {
	const values = new Map<string, string>();
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key),
		clear: () => values.clear(),
		key: (index: number) => [...values.keys()][index] ?? null,
		get length() {
			return values.size;
		},
	};
}

describe('custom Typst templates', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.mocked(compileToPdf).mockResolvedValue(new Uint8Array([1]));
		vi.stubGlobal('window', { sessionStorage: storage() });
		customTemplateStore.clear();
		customTemplateStores.cv.clear();
	});

	it('requires the content marker and all template helpers', () => {
		expect(validateTemplateSource(VALID_TEMPLATE)).toBeNull();
		expect(validateTemplateSource(VALID_TEMPLATE.replace('// ========== RESUME CONTENT ==========', ''))).toContain(
			'must contain',
		);
		expect(validateTemplateSource(VALID_TEMPLATE.replace('#let skills(body) = body', ''))).toContain('skills');
	});

	it('rejects a helper declaration hidden in a line comment', () => {
		const commented = VALID_TEMPLATE.replace('#let skills(body) = body', '// #let skills(body) = body');
		expect(validateTemplateSource(commented)).toContain('skills');
	});

	it('compiles a canonical fixture that exercises every helper', async () => {
		expect(await validateTemplateCompatibility(VALID_TEMPLATE)).toBeNull();
		const compiled = vi.mocked(compileToPdf).mock.calls[0][0];
		for (const invocation of [
			'#show: resume.with(',
			'#work-heading(',
			'#project-heading(',
			'#education-heading(',
			'#achievement-heading(',
			'#skills[',
		]) {
			expect(compiled).toContain(invocation);
		}
	});

	it('rejects an incompatible helper signature when the fixture does not compile', async () => {
		const incompatible = VALID_TEMPLATE.replace('#let skills(body)', '#let skills()');
		vi.mocked(compileToPdf).mockRejectedValueOnce(new Error('unexpected argument'));
		expect(await validateTemplateCompatibility(incompatible)).toContain('unexpected argument');
	});

	it('rejects templates larger than one megabyte', () => {
		expect(validateTemplateSource(`${VALID_TEMPLATE}${'x'.repeat(MAX_TEMPLATE_SIZE)}`)).toContain('1 MB');
	});

	it('saves, restores, and clears a template in session storage', async () => {
		const template = { name: 'mine.typ', source: VALID_TEMPLATE };
		customTemplateStore.save(template);
		expect(JSON.parse(window.sessionStorage.getItem(TEMPLATE_STORAGE_KEY)!)).toEqual(template);

		customTemplateStore.clear();
		window.sessionStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template));
		await customTemplateStore.loadFromStorage();
		expect(get(customTemplateStore)).toEqual(template);

		customTemplateStore.clear();
		expect(get(customTemplateStore)).toBeNull();
		expect(window.sessionStorage.getItem(TEMPLATE_STORAGE_KEY)).toBeNull();
	});

	it('does not activate a stored template that fails the full compile gate', async () => {
		const template = { name: 'broken.typ', source: VALID_TEMPLATE.replace('#let skills(body)', '#let skills()') };
		window.sessionStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template));
		vi.mocked(compileToPdf).mockRejectedValueOnce(new Error('unexpected argument'));

		await customTemplateStore.loadFromStorage();

		expect(get(customTemplateStore)).toBeNull();
		expect(window.sessionStorage.getItem(TEMPLATE_STORAGE_KEY)).toBeNull();
	});

	it('removes stored data with an invalid template shape', async () => {
		window.sessionStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify({ name: 'broken.typ' }));

		await customTemplateStore.loadFromStorage();

		expect(get(customTemplateStore)).toBeNull();
		expect(window.sessionStorage.getItem(TEMPLATE_STORAGE_KEY)).toBeNull();
	});

	it('updates the in-memory store when storage writes fail', () => {
		const template = { name: 'mine.typ', source: VALID_TEMPLATE };
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.stubGlobal('window', {
			sessionStorage: {
				...storage(),
				setItem: () => {
					throw new DOMException('denied', 'SecurityError');
				},
				removeItem: () => {
					throw new DOMException('denied', 'SecurityError');
				},
			},
		});

		customTemplateStore.save(template);
		expect(get(customTemplateStore)).toEqual(template);
		customTemplateStore.clear();
		expect(get(customTemplateStore)).toBeNull();
	});

	it('handles failure while accessing the sessionStorage property', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const deniedWindow = {} as Window;
		Object.defineProperty(deniedWindow, 'sessionStorage', {
			get: () => {
				throw new DOMException('denied', 'SecurityError');
			},
		});
		vi.stubGlobal('window', deniedWindow);

		await expect(customTemplateStore.loadFromStorage()).resolves.toBeUndefined();
	});

	it('handles a throwing sessionStorage read', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.stubGlobal('window', {
			sessionStorage: {
				...storage(),
				getItem: () => {
					throw new DOMException('denied', 'SecurityError');
				},
			},
		});

		await expect(customTemplateStore.loadFromStorage()).resolves.toBeUndefined();
		expect(get(customTemplateStore)).toBeNull();
	});

	it('keeps separate templates per document type and leaves the resume key unchanged', async () => {
		expect(templateStorageKey('resume')).toBe(TEMPLATE_STORAGE_KEY);
		expect(templateStorageKey('cv')).not.toBe(TEMPLATE_STORAGE_KEY);

		const resumeTemplate = { name: 'resume.typ', source: VALID_TEMPLATE };
		const cvTemplate = { name: 'cv.typ', source: `${VALID_TEMPLATE}\n` };
		customTemplateStore.save(resumeTemplate);
		customTemplateStores.cv.save(cvTemplate);
		expect(get(customTemplateStores.resume)).toEqual(resumeTemplate);
		expect(get(customTemplateStores.cv)).toEqual(cvTemplate);

		customTemplateStores.cv.clear();
		expect(get(customTemplateStores.resume)).toEqual(resumeTemplate);
		expect(window.sessionStorage.getItem(TEMPLATE_STORAGE_KEY)).not.toBeNull();
		expect(window.sessionStorage.getItem(templateStorageKey('cv'))).toBeNull();
	});

	it('validates a CV template against a CV fixture', async () => {
		expect(await validateTemplateCompatibility(VALID_TEMPLATE, 'cv')).toBeNull();
		const compiled = vi.mocked(compileToPdf).mock.calls[0][0];
		expect(compiled).toContain('#show: resume.with(');
		expect(compiled).toContain('= Example Section');

		vi.mocked(compileToPdf).mockRejectedValueOnce(new Error('unexpected argument'));
		expect(await validateTemplateCompatibility(VALID_TEMPLATE, 'cv')).toContain('CV format');
	});

	it('restores a stored CV template only after compiling it against the CV fixture', async () => {
		const template = { name: 'cv.typ', source: VALID_TEMPLATE };
		window.sessionStorage.setItem(templateStorageKey('cv'), JSON.stringify(template));
		await customTemplateStores.cv.loadFromStorage();
		expect(get(customTemplateStores.cv)).toEqual(template);
		expect(get(customTemplateStores.resume)).toBeNull();
	});

	it.each(['resume', 'cv'] as const)('keeps a newer %s template when an older load fails validation', async (type) => {
		const store = customTemplateStores[type];
		const key = templateStorageKey(type);
		window.sessionStorage.setItem(key, JSON.stringify({ name: 'old.typ', source: VALID_TEMPLATE }));
		let rejectValidation!: (error: Error) => void;
		vi.mocked(compileToPdf).mockImplementationOnce(() => new Promise((_, reject) => (rejectValidation = reject)));
		const loading = store.loadFromStorage();
		const newer = { name: 'new.typ', source: `${VALID_TEMPLATE}\n// New template` };
		store.save(newer);
		rejectValidation(new Error('old template is incompatible'));
		await loading;
		expect(get(store)).toEqual(newer);
		expect(JSON.parse(window.sessionStorage.getItem(key)!)).toEqual(newer);
	});

	it('does not restore a template when its asynchronous validation finishes after clear', async () => {
		const template = { name: 'mine.typ', source: VALID_TEMPLATE };
		window.sessionStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template));
		let finishValidation!: (value: Uint8Array) => void;
		vi.mocked(compileToPdf).mockImplementationOnce(() => new Promise((resolve) => (finishValidation = resolve)));

		const loading = customTemplateStore.loadFromStorage();
		customTemplateStore.clear();
		finishValidation(new Uint8Array([1]));
		await loading;

		expect(get(customTemplateStore)).toBeNull();
		expect(window.sessionStorage.getItem(TEMPLATE_STORAGE_KEY)).toBeNull();
	});
});
