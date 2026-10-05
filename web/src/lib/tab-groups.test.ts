import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';
import { groupTabs } from './tab-groups';

const tab = (id: string) => ({ id, label: id });

describe('groupTabs', () => {
	it('separates presentation settings and less common content from the main sections', () => {
		const groups = groupTabs(['personal', 'layout', 'publications', 'education', 'fonts', 'colors', 'custom'].map(tab));
		expect(groups.primary.map((t) => t.id)).toEqual(['personal', 'education']);
		expect(groups.more.map((t) => t.id)).toEqual(['publications', 'custom']);
		expect(groups.appearance.map((t) => t.id)).toEqual(['layout', 'fonts', 'colors']);
	});

	it('places every section in exactly one group, with unknown ids visible by default', () => {
		const input = ['personal', 'newSection', 'layout', 'skills', 'presentations'].map(tab);
		const groups = groupTabs(input);
		const flat = [...groups.primary, ...groups.more, ...groups.appearance].map((t) => t.id);
		expect(flat.sort()).toEqual(input.map((t) => t.id).sort());
		expect(groups.primary.map((t) => t.id)).toContain('newSection');
	});

	it('returns empty groups for no tabs', () => {
		expect(groupTabs([])).toEqual({ primary: [], more: [], appearance: [] });
	});
});

describe('TabBar', () => {
	it('compiles without accessibility warnings', () => {
		const file = fileURLToPath(new URL('./components/TabBar.svelte', import.meta.url));
		const result = compile(readFileSync(file, 'utf8'), { filename: file, generate: false });
		expect(result.warnings.filter((warning) => warning.code.startsWith('a11y_'))).toEqual([]);
	});
});
