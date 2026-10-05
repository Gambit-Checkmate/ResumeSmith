import { describe, expect, it } from 'vitest';
import {
	clearResumeSmithBrowserStorage,
	OWNED_LOCAL_STORAGE_KEYS,
	OWNED_SESSION_STORAGE_KEYS,
	removeOwnedStorageKeys,
} from './clear-browser-data';

function storage(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => values.get(key) ?? null,
		removeItem: (key: string) => values.delete(key),
		setItem: (key: string, value: string) => values.set(key, value),
		values,
	};
}

describe('clearResumeSmithBrowserStorage', () => {
	it('removes owned local and session keys while preserving unrelated origin data', () => {
		const local = storage({
			unrelated: 'keep',
			resumeData: 'resume',
			onetSelection: 'occupation',
			cvBibliography: 'bib',
		});
		const session = storage({
			unrelatedSession: 'keep',
			customTypstTemplate: 'resume template',
			'customTypstTemplate:cv': 'CV template',
		});

		const result = clearResumeSmithBrowserStorage(local, session);

		expect(result.local.removed).toEqual([...OWNED_LOCAL_STORAGE_KEYS]);
		expect(result.session.removed).toEqual([...OWNED_SESSION_STORAGE_KEYS]);
		expect([...local.values]).toEqual([['unrelated', 'keep']]);
		expect([...session.values]).toEqual([['unrelatedSession', 'keep']]);
	});

	it('reports keys that could not be removed instead of claiming success', () => {
		const result = removeOwnedStorageKeys(
			{
				getItem: (key) => (key === 'blocked' ? 'still here' : null),
				removeItem: (key) => {
					if (key === 'throws') throw new DOMException('denied', 'SecurityError');
				},
			},
			['removed', 'blocked', 'throws'],
		);

		expect(result.removed).toEqual(['removed']);
		expect(result.failed).toEqual(['blocked', 'throws']);
	});
});
