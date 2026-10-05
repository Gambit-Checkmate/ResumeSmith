import { loadFonts } from '@myriaddreamin/typst.ts';
import { TypstSnippet } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs';
import { downloadBlob } from './browser-download';
import { fontFilesFor } from './fonts';

export interface PreviewPage {
	pageOffset: number;
	width: number;
	height: number;
}

export interface CompiledPreview {
	svg: string;
	pages: PreviewPage[];
}

function pageInfoFromSvg(svg: string): PreviewPage[] {
	const pages = [...svg.matchAll(/<g\b[^>]*\bclass="[^"]*\btypst-page\b[^"]*"[^>]*>/g)].map(([tag], pageOffset) => {
		const width = Number(tag.match(/\bdata-page-width="([^"]+)"/)?.[1]);
		const height = Number(tag.match(/\bdata-page-height="([^"]+)"/)?.[1]);
		if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
			throw new Error('Preview page is missing valid dimensions');
		}
		return { pageOffset, width, height };
	});
	if (pages.length === 0) throw new Error('Preview contains no pages');
	return pages;
}

// Typst fonts are fixed when a compiler is built, so each font set gets its own compiler. Only the
// web fonts a resume actually selects are downloaded; built-in fonts load with every compiler.
const compilers = new Map<string, Promise<TypstSnippet>>();
let documentFontFiles: string[] = [];

function compilerFor(files: string[]): Promise<TypstSnippet> {
	const key = files.join('\n');
	const existing = compilers.get(key);
	if (existing) return existing;

	// Keep the default compiler warm, but drop compilers for fonts the resume no longer uses.
	for (const other of compilers.keys()) {
		if (other !== '') compilers.delete(other);
	}

	const compiler = (async () => {
		const snippet = new TypstSnippet();
		snippet.setCompilerInitOptions({
			getModule: () => fetch('/typst_ts_web_compiler_bg.wasm').then((r) => r.arrayBuffer()),
			beforeBuild: files.length > 0 ? [loadFonts(files)] : [],
		});
		snippet.setRendererInitOptions({
			getModule: () => fetch('/typst_ts_renderer_bg.wasm').then((r) => r.arrayBuffer()),
		});
		await snippet.pdf({ mainContent: '' });
		return snippet;
	})();
	compilers.set(key, compiler);
	compiler.catch(() => compilers.delete(key));
	return compiler;
}

/** Sets the font families the next compilations must be able to render. */
export function setDocumentFonts(families: string[]): void {
	documentFontFiles = fontFilesFor(families);
}

export async function initCompiler(): Promise<void> {
	await compilerFor([]);
}

export async function compileToPdf(typstCode: string): Promise<Uint8Array> {
	const typst = await compilerFor(documentFontFiles);

	try {
		const pdfData = await typst.pdf({ mainContent: typstCode });
		if (!pdfData) throw new Error('PDF compilation returned no data');
		return pdfData;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(message);
	}
}

export async function compileToPreview(typstCode: string): Promise<CompiledPreview> {
	const typst = await compilerFor(documentFontFiles);

	try {
		const vectorData = await typst.vector({ mainContent: typstCode });
		if (!vectorData) throw new Error('Preview compilation returned no data');

		const renderer = await typst.getRenderer();
		return renderer.runWithSession({ format: 'vector', artifactContent: vectorData }, async (session) => {
			const svg = await session.renderSvg({});
			// The SVG carries each page's dimensions. retrievePagesInfo() creates temporary WASM
			// PageInfo handles that its wrapper does not free before the render session ends.
			return { svg, pages: pageInfoFromSvg(svg) };
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(message);
	}
}

export function downloadPdf(pdfData: Uint8Array, filename: string = 'resume.pdf'): void {
	const blob = new Blob([new Uint8Array(pdfData)], { type: 'application/pdf' });
	downloadBlob(blob, filename);
}
