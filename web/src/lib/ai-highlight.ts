import { SvelteSet } from 'svelte/reactivity';
import type { ResumeData } from './types';

// Reactive set of dotted field paths that were filled by the AI, e.g.
// "personalInfo.name", "workExperience.0.title", "education.1.bullets.2".
export const aiFilled = new SvelteSet<string>();

export function clearHighlight(path: string): void {
	aiFilled.delete(path);
}

export function resetHighlights(): void {
	aiFilled.clear();
}

/** Swap complete dotted index segments, including nested fields and bullet paths. */
export function swapIndexedHighlights(prefix: string, first: number, second: number): void {
	const firstPath = `${prefix}.${first}`;
	const secondPath = `${prefix}.${second}`;
	const swapped = [...aiFilled].map((path) => {
		if (path === firstPath || path.startsWith(`${firstPath}.`)) return secondPath + path.slice(firstPath.length);
		if (path === secondPath || path.startsWith(`${secondPath}.`)) return firstPath + path.slice(secondPath.length);
		return path;
	});
	aiFilled.clear();
	for (const path of swapped) aiFilled.add(path);
}

function markObject(prefix: string, obj: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(obj)) {
		if (key === 'id') continue;
		const path = `${prefix}${key}`;
		if (typeof value === 'string') {
			if (value.trim() !== '') aiFilled.add(path);
		} else if (Array.isArray(value)) {
			// bullets: string[]
			value.forEach((item, i) => {
				if (typeof item === 'string' && item.trim() !== '') aiFilled.add(`${path}.${i}`);
			});
		}
		// booleans (isPresent) are intentionally not highlighted
	}
}

const ARRAY_SECTIONS = [
	'education',
	'projects',
	'workExperience',
	'leadership',
	'skills',
	'achievements',
	'publications',
	'presentations',
	'clearance',
] as const;

export function setHighlightsFromData(data: ResumeData): void {
	aiFilled.clear();
	markObject('personalInfo.', data.personalInfo as unknown as Record<string, unknown>);
	markObject('profile.', data.profile as unknown as Record<string, unknown>);
	for (const section of ARRAY_SECTIONS) {
		const arr = data[section] as unknown as Record<string, unknown>[];
		arr.forEach((item, i) => markObject(`${section}.${i}.`, item));
	}
	data.customSections.forEach((section, i) => {
		if (section.heading.trim()) aiFilled.add(`customSections.${i}.heading`);
		section.entries.forEach((entry, j) =>
			markObject(`customSections.${i}.entries.${j}.`, entry as unknown as Record<string, unknown>),
		);
	});
}
