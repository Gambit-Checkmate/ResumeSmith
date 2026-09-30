import type { OnetOccupationRef } from './onet-types';

export type OnetSearchState = {
	results: OnetOccupationRef[];
	searching: boolean;
	searched: boolean;
	error: string;
};

const emptyState = (): OnetSearchState => ({ results: [], searching: false, searched: false, error: '' });

export function createOnetSearch(
	request: (keyword: string, signal: AbortSignal) => Promise<OnetOccupationRef[]>,
	update: (state: OnetSearchState) => void,
	fallbackError: string,
) {
	let generation = 0;
	let controller: AbortController | null = null;

	function invalidate() {
		generation++;
		controller?.abort();
		controller = null;
		update(emptyState());
	}

	async function run(keyword: string) {
		invalidate();
		if (!keyword.trim()) return;

		const current = generation;
		const active = new AbortController();
		controller = active;
		update({ results: [], searching: true, searched: false, error: '' });
		try {
			const results = await request(keyword, active.signal);
			if (current !== generation) return;
			update({ results, searching: false, searched: true, error: '' });
		} catch (error) {
			if (current !== generation) return;
			update({
				results: [],
				searching: false,
				searched: true,
				error: error instanceof Error ? error.message : fallbackError,
			});
		} finally {
			if (controller === active) controller = null;
		}
	}

	return { run, invalidate };
}
