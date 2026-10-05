import { writable } from 'svelte/store';
import { compileToPdf } from './pdf-compiler';
import {
	bibliographyMarkup,
	compileErrorMessage,
	isBibliography,
	validateBibliographySource,
	type Bibliography,
} from './bibliography';

export const BIBLIOGRAPHY_STORAGE_KEY = 'cvBibliography';

/** Compiles the bibliography on its own, so a malformed file is rejected before it can break the CV. */
export async function validateBibliography(bibliography: Bibliography): Promise<string | null> {
	const sourceError = validateBibliographySource(bibliography.name, bibliography.source);
	if (sourceError) return sourceError;
	try {
		await compileToPdf(bibliographyMarkup(bibliography));
		return null;
	} catch (error) {
		return `The BibTeX file could not be read: ${compileErrorMessage(error)}`;
	}
}

function storage(): Storage | null {
	try {
		return typeof window === 'undefined' ? null : window.localStorage;
	} catch (error) {
		console.error('Failed to access local storage for the bibliography:', error);
		return null;
	}
}

function createBibliographyStore() {
	const { subscribe, set } = writable<Bibliography | null>(null);
	let generation = 0;

	function write(value: Bibliography | null) {
		generation++;
		try {
			if (value) storage()?.setItem(BIBLIOGRAPHY_STORAGE_KEY, JSON.stringify(value));
			else storage()?.removeItem(BIBLIOGRAPHY_STORAGE_KEY);
		} catch (error) {
			console.error('Failed to update the bibliography in local storage:', error);
		}
		set(value);
	}

	return {
		subscribe,
		loadFromStorage: async () => {
			const loadGeneration = generation;
			let saved: unknown;
			try {
				const raw = storage()?.getItem(BIBLIOGRAPHY_STORAGE_KEY);
				if (!raw) return;
				saved = JSON.parse(raw);
			} catch (error) {
				console.error('Failed to read the bibliography from local storage:', error);
				write(null);
				return;
			}
			if (!isBibliography(saved)) {
				write(null);
				return;
			}
			const invalid = await validateBibliography(saved);
			if (loadGeneration !== generation) return;
			if (invalid) {
				write(null);
				return;
			}
			set(saved);
		},
		save: (bibliography: Bibliography) => write(bibliography),
		clear: () => write(null),
	};
}

export const bibliographyStore = createBibliographyStore();
