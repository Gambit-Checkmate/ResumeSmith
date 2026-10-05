import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { beforeAll, describe, expect, it } from 'vitest';

const file = fileURLToPath(new URL('./components/AppFooter.svelte', import.meta.url));

describe('footer', () => {
	let html: string;

	beforeAll(async () => {
		// vite.config.ts injects the version at build time; the test environment has no such define.
		(globalThis as { __APP_VERSION__?: string }).__APP_VERSION__ = 'Test';
		const { default: AppFooter } = await import('./components/AppFooter.svelte');
		html = render(AppFooter).body.replace(/<!--.*?-->/g, '');
	});

	it('compiles without accessibility warnings', () => {
		const result = compile(readFileSync(file, 'utf8'), { filename: file, generate: false });
		expect(result.warnings.filter((warning) => warning.code.startsWith('a11y_'))).toEqual([]);
	});

	it('keeps the required O*NET attribution text and license links', () => {
		const text = html
			.replace(/<[^>]+>/g, ' ')
			.replace(/&reg;/g, '®')
			.replace(/\s+/g, ' ');
		expect(text).toContain(
			'This site incorporates information from O*NET Web Services by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET® is a trademark of USDOL/ETA. O*NET Web Services Data License by U.S. Department of Labor, Employment and Training Administration is licensed under a Creative Commons Attribution 4.0 International License .',
		);
		expect(html).toContain('href="https://creativecommons.org/licenses/by/4.0/"');
		expect(html).toContain('href="https://services.onetcenter.org/"');
	});

	it('keeps the badge artwork and its dimensions', () => {
		expect(html).toMatch(/<img[^>]*src="\/onet-in-it\.svg"[^>]*alt="O\*NET in-it"[^>]*width="130"[^>]*height="60"/);
	});

	it('keeps the credits and version', () => {
		const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
		expect(text).toContain('Austin Sternberg');
		expect(text).toMatch(/Typst\s+Layout by\s+TJ Raklovits/);
		expect(text).toMatch(/Version:\s+Test/);
		expect(html).toContain('href="https://github.com/YoyoJesus/ResumeSmith"');
	});

	it('opens every link in a new tab without leaking the opener', () => {
		const anchors = html.match(/<a\s[^>]*>/g) ?? [];
		expect(anchors.length).toBeGreaterThanOrEqual(7);
		for (const anchor of anchors) {
			expect(anchor).toContain('target="_blank"');
			expect(anchor).toContain('rel="noopener noreferrer"');
		}
	});
});
