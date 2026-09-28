// Compiles generated documents with the Typst build the app ships, so layout code that only the
// compiler can check (page setup, running headers, counters) is exercised. Needs network access
// to jsDelivr for the default fonts, like the other WASM suites.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { $typst } from '@myriaddreamin/typst.ts';
import { generateTypstCode } from './typst-generator';
import { withDocumentType } from './resume-utils';
import { defaultResumeData, type ResumeData } from './types';

const COMPILER_WASM = 'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm';
const RENDERER_WASM = 'node_modules/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm';
const TIMEOUT = { timeout: 300000 };

$typst.setCompilerInitOptions({ getModule: () => readFileSync(COMPILER_WASM).buffer });
$typst.setRendererInitOptions({ getModule: () => readFileSync(RENDERER_WASM).buffer });

function longDocument(documentType: ResumeData['documentType']): ResumeData {
	const data = withDocumentType(structuredClone(defaultResumeData), documentType);
	data.personalInfo.name = 'Test Person';
	data.workExperience = Array.from({ length: 60 }, (_, index) => ({
		id: `w${index}`,
		title: `Position ${index}`,
		company: 'Example University',
		location: 'Example City',
		startDate: '2020-01',
		endDate: '2021-01',
		isPresent: false,
		bullets: ['Representative detail about the appointment.', 'Another representative detail.'],
	}));
	return data;
}

// The compiler reports the page count through a compile-time assertion; each guess is one compile.
async function pageCount(source: string): Promise<number> {
	for (let count = 1; count <= 20; count++) {
		try {
			await $typst.svg({ mainContent: `${source}\n#context assert(counter(page).final().first() == ${count})` });
			return count;
		} catch {
			// Not this many pages.
		}
	}
	throw new Error('page count not found');
}

it('compiles an empty CV to a single page', TIMEOUT, async () => {
	const data = { ...structuredClone(defaultResumeData), documentType: 'cv' as const };
	expect(await pageCount(generateTypstCode(data))).toBe(1);
});

it('lays a long CV out over more pages than the dense resume layout', TIMEOUT, async () => {
	const cvPages = await pageCount(generateTypstCode(longDocument('cv')));
	expect(cvPages).toBeGreaterThan(1);
	expect(cvPages).toBeGreaterThan(await pageCount(generateTypstCode(longDocument('resume'))));
});

it('compiles custom sections carrying markup and quote payloads', TIMEOUT, async () => {
	const data = structuredClone(defaultResumeData);
	data.customSections = [
		{
			id: 'c',
			heading: '= Talks] #eval("1")',
			entries: [{ id: 'e', title: 'A "title" \\ #x', date: '2020") #panic("x', bullets: ['close] #panic("y")'] }],
		},
	];
	data.sectionOrder = [...data.sectionOrder, 'custom:c'];
	await expect($typst.svg({ mainContent: generateTypstCode(data) })).resolves.toBeTruthy();
});
