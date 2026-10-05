import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
	const session = {
		renderSvg: vi
			.fn()
			.mockResolvedValue(
				'<svg class="typst-doc"><g class="typst-page" data-page-width="595" data-page-height="842"></g><g class="typst-page" data-page-width="612.5" data-page-height="792"></g></svg>',
			),
		retrievePagesInfo: vi.fn(),
	};
	return {
		pdf: vi.fn().mockResolvedValue(new Uint8Array([1])),
		vector: vi.fn().mockResolvedValue(new Uint8Array([2])),
		runWithSession: vi.fn(async (_options, work) => work(session)),
		setCompilerInitOptions: vi.fn(),
		loadFonts: vi.fn((files: string[]) => ({ files })),
		instances: 0,
		session,
	};
});

vi.mock('@myriaddreamin/typst.ts', () => ({ loadFonts: mocks.loadFonts }));

vi.mock('@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs', () => ({
	TypstSnippet: class {
		constructor() {
			mocks.instances++;
		}
		setCompilerInitOptions = mocks.setCompilerInitOptions;
		setRendererInitOptions = vi.fn();
		pdf = mocks.pdf;
		vector = mocks.vector;
		getRenderer = vi.fn().mockResolvedValue({ runWithSession: mocks.runWithSession });
	},
}));

import { compileToPdf, compileToPreview, setDocumentFonts } from './pdf-compiler';

beforeEach(() => {
	vi.clearAllMocks();
	setDocumentFonts([]);
});

it('reads each page size from the rendered SVG without creating PageInfo handles', async () => {
	const preview = await compileToPreview('#pagebreak()');

	expect(preview).toEqual({
		svg: '<svg class="typst-doc"><g class="typst-page" data-page-width="595" data-page-height="842"></g><g class="typst-page" data-page-width="612.5" data-page-height="792"></g></svg>',
		pages: [
			{ pageOffset: 0, width: 595, height: 842 },
			{ pageOffset: 1, width: 612.5, height: 792 },
		],
	});
	expect(mocks.vector).toHaveBeenCalledWith({ mainContent: '#pagebreak()' });
	expect(mocks.runWithSession).toHaveBeenCalledWith(
		{ format: 'vector', artifactContent: new Uint8Array([2]) },
		expect.any(Function),
	);
	expect(mocks.session.retrievePagesInfo).not.toHaveBeenCalled();
});

it('does not create PageInfo handles across repeated multi-page previews', async () => {
	for (let i = 0; i < 5; i++) {
		await expect(compileToPreview(`Revision ${i}`)).resolves.toHaveProperty('pages.length', 2);
	}
	expect(mocks.session.retrievePagesInfo).not.toHaveBeenCalled();
});

it.each([
	'<svg class="typst-doc"></svg>',
	'<svg><g class="typst-page" data-page-width="595"></g></svg>',
	'<svg><g class="typst-page" data-page-width="0" data-page-height="842"></g></svg>',
])('rejects preview SVG without valid page metadata', async (svg) => {
	mocks.session.renderSvg.mockResolvedValueOnce(svg);
	await expect(compileToPreview('Hello')).rejects.toThrow(/page|pages/);
	expect(mocks.session.retrievePagesInfo).not.toHaveBeenCalled();
});

it('builds the default compiler without downloading web fonts', async () => {
	setDocumentFonts(['Libertinus Serif', 'New Computer Modern']);
	await compileToPdf('Hi');
	expect(mocks.loadFonts).not.toHaveBeenCalled();
});

it('builds one compiler for a web font selection and reuses it', async () => {
	const before = mocks.instances;
	setDocumentFonts(['Lato', 'Libertinus Serif']);
	await compileToPdf('Hi');
	await compileToPreview('Hi');

	expect(mocks.instances).toBe(before + 1);
	expect(mocks.loadFonts).toHaveBeenCalledTimes(1);
	const [files] = mocks.loadFonts.mock.calls[0];
	expect(files).toHaveLength(4);
	expect(files.every((file: string) => file.includes('/lato@'))).toBe(true);
	expect(mocks.setCompilerInitOptions).toHaveBeenCalledWith(expect.objectContaining({ beforeBuild: [{ files }] }));
});
