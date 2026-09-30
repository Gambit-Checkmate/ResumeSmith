import { describe, expect, it, vi } from 'vitest';
import { createOnetSearch, type OnetSearchState } from './onet-search';
import type { OnetOccupationRef } from './onet-types';

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: Error) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}

const engineer: OnetOccupationRef = { code: '15-1252.00', title: 'Software Developer', brightOutlook: true };
const nurse: OnetOccupationRef = { code: '29-1141.00', title: 'Registered Nurse', brightOutlook: false };

describe('latest O*NET search', () => {
	it('keeps the newer result when requests finish out of order', async () => {
		const first = deferred<OnetOccupationRef[]>();
		const second = deferred<OnetOccupationRef[]>();
		const update = vi.fn<(state: OnetSearchState) => void>();
		const request = vi.fn((keyword: string) => (keyword === 'engineer' ? first.promise : second.promise));
		const search = createOnetSearch(request, update, 'Network error');

		const oldRun = search.run('engineer');
		const newRun = search.run('nurse');
		second.resolve([nurse]);
		await newRun;
		first.resolve([engineer]);
		await oldRun;

		expect(update).toHaveBeenLastCalledWith({ results: [nurse], searching: false, searched: true, error: '' });
	});

	it('ignores a late success after the query is cleared', async () => {
		const pending = deferred<OnetOccupationRef[]>();
		const update = vi.fn<(state: OnetSearchState) => void>();
		const search = createOnetSearch(() => pending.promise, update, 'Network error');
		const run = search.run('engineer');
		search.invalidate();
		pending.resolve([engineer]);
		await run;
		expect(update).toHaveBeenLastCalledWith({ results: [], searching: false, searched: false, error: '' });
	});

	it('ignores a late error after closing or selecting an occupation', async () => {
		const pending = deferred<OnetOccupationRef[]>();
		const update = vi.fn<(state: OnetSearchState) => void>();
		const search = createOnetSearch(() => pending.promise, update, 'Network error');
		const run = search.run('engineer');
		search.invalidate();
		pending.reject(new Error('Old failure'));
		await run;
		expect(update).toHaveBeenLastCalledWith({ results: [], searching: false, searched: false, error: '' });
	});

	it('reports a current failure and resets it for the next query', async () => {
		const update = vi.fn<(state: OnetSearchState) => void>();
		const search = createOnetSearch(
			async () => {
				throw new Error('Service unavailable');
			},
			update,
			'Network error',
		);
		await search.run('engineer');
		expect(update).toHaveBeenLastCalledWith({
			results: [],
			searching: false,
			searched: true,
			error: 'Service unavailable',
		});
		search.invalidate();
		expect(update).toHaveBeenLastCalledWith({ results: [], searching: false, searched: false, error: '' });
	});
});
