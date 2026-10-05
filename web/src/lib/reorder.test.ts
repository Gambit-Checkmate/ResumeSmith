import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aiFilled, resetHighlights } from './ai-highlight';
import { applyTailorEdits } from './onet-apply';
import { moveAt, moveWithHighlights } from './reorder';
import { defaultResumeData } from './types';
import { generateTypstCode } from './typst-generator';

beforeEach(resetHighlights);
afterEach(resetHighlights);

describe('reordering', () => {
	it('keeps the original array and IDs at boundaries, including a single item', () => {
		const single = [{ id: 'only' }];
		expect(moveAt(single, 0, -1)).toBe(single);
		expect(moveAt(single, 0, 1)).toBe(single);
		expect(moveAt(single, -1, 1)).toBe(single);
		expect(moveAt(single, 1, -1)).toBe(single);
	});

	it('moves adjacent entries without changing their content or IDs', () => {
		const entries = [
			{ id: 'a', value: 'first' },
			{ id: 'b', value: 'second' },
			{ id: 'c', value: 'third' },
		];
		const moved = moveAt(entries, 0, 1);
		expect(moved).toEqual([entries[1], entries[0], entries[2]]);
		expect(entries.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
		expect(moveAt(moved, 1, -1)).toEqual(entries);
	});

	it('moves multiple AI highlights with their entries, including nested bullets', () => {
		aiFilled.add('workExperience.0.title');
		aiFilled.add('workExperience.0.bullets.1');
		aiFilled.add('workExperience.1.company');
		aiFilled.add('workExperience.10.title');
		aiFilled.add('profile.summary');
		const entries = [{ id: 'first' }, { id: 'second' }];
		expect(moveWithHighlights(entries, 'workExperience', 0, 1)).toEqual([entries[1], entries[0]]);
		expect([...aiFilled].sort()).toEqual(
			[
				'profile.summary',
				'workExperience.0.company',
				'workExperience.1.bullets.1',
				'workExperience.1.title',
				'workExperience.10.title',
			].sort(),
		);
	});

	it('moves bullet highlights and custom entry highlights without touching neighbors', () => {
		aiFilled.add('projects.0.bullets.0');
		aiFilled.add('customSections.0.entries.0.title');
		aiFilled.add('customSections.0.entries.1.bullets.0');
		moveWithHighlights(['first', 'second'], 'projects.0.bullets', 0, 1);
		moveWithHighlights([{ id: 'a' }, { id: 'b' }], 'customSections.0.entries', 0, 1);
		expect([...aiFilled].sort()).toEqual(
			['projects.0.bullets.1', 'customSections.0.entries.0.bullets.0', 'customSections.0.entries.1.title'].sort(),
		);
	});

	it('persists the new order in generated Typst and rejects an in-flight AI batch', () => {
		const data = structuredClone(defaultResumeData);
		data.projects = [
			{ id: 'a', name: 'First Project', stack: '', url: '', award: '', bullets: ['First bullet'] },
			{ id: 'b', name: 'Second Project', stack: '', url: '', award: '', bullets: ['Second bullet'] },
		];
		const submitted = structuredClone(data);
		data.projects = moveWithHighlights(data.projects, 'projects', 0, 1);
		const generated = generateTypstCode(data);
		expect(generated.indexOf('Second Project')).toBeLessThan(generated.indexOf('First Project'));
		expect(generated.indexOf('Second bullet')).toBeLessThan(generated.indexOf('First bullet'));
		expect(JSON.parse(JSON.stringify(data)).projects.map((project: { id: string }) => project.id)).toEqual(['b', 'a']);
		expect(applyTailorEdits(submitted, data, []).stale).toBe(true);
	});
});
