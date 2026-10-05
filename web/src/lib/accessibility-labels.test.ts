import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

const components = fileURLToPath(new URL('./components/', import.meta.url));
const formFiles = readdirSync(resolve(components, 'forms'))
	.filter((file) => file.endsWith('.svelte'))
	.map((file) => resolve(components, 'forms', file));

describe('form labels', () => {
	it.each([...formFiles, resolve(components, 'DateRange.svelte'), resolve(components, 'BulletEditor.svelte')])(
		'has no unassociated labels in %s',
		(file) => {
			const result = compile(readFileSync(file, 'utf8'), { filename: file, generate: false });
			expect(result.warnings.filter((warning) => warning.code === 'a11y_label_has_associated_control')).toEqual([]);
		},
	);
});

describe('header', () => {
	it('compiles without accessibility warnings', () => {
		const file = resolve(components, 'AppHeader.svelte');
		const result = compile(readFileSync(file, 'utf8'), { filename: file, generate: false });
		expect(result.warnings.filter((warning) => warning.code.startsWith('a11y_'))).toEqual([]);
	});
});
