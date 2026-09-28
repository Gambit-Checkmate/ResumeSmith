// Compiles generated documents with the Typst build the app ships, so layout code that only the
// compiler can check (page setup, running headers, counters) is exercised. Needs network access
// to jsDelivr for the default fonts, like the other WASM suites.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { $typst } from '@myriaddreamin/typst.ts';
import { generateTypstCode } from './typst-generator';
import { defaultResumeData, type ResumeData } from './types';

const COMPILER_WASM = 'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm';
const RENDERER_WASM = 'node_modules/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm';
const TIMEOUT = { timeout: 300000 };

$typst.setCompilerInitOptions({ getModule: () => readFileSync(COMPILER_WASM).buffer });
$typst.setRendererInitOptions({ getModule: () => readFileSync(RENDERER_WASM).buffer });

function longDocument(documentType: ResumeData['documentType']): ResumeData {
	const data = structuredClone(defaultResumeData);
	data.documentType = documentType;
	data.personalInfo.name = 'Test Person';
	data.workExperience = Array.from({ length: 30 }, (_, index) => ({
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

// Appends a compile-time assertion so the compiler itself reports the page count.
const assertPages = (source: string, check: string) =>
	$typst.svg({ mainContent: `${source}\n#context assert(${check}, message: "page count")` });

it('lays a long CV out over several numbered pages', TIMEOUT, async () => {
	await expect(
		assertPages(generateTypstCode(longDocument('cv')), 'counter(page).final().first() > 2'),
	).resolves.toBeTruthy();
});

it('compiles an empty CV to a single page', TIMEOUT, async () => {
	const data = { ...structuredClone(defaultResumeData), documentType: 'cv' as const };
	await expect(assertPages(generateTypstCode(data), 'counter(page).final().first() == 1')).resolves.toBeTruthy();
});

it('gives the CV fewer entries per page than the dense resume layout', TIMEOUT, async () => {
	const pages = async (data: ResumeData) => {
		for (let count = 1; count <= 20; count++) {
			try {
				await assertPages(generateTypstCode(data), `counter(page).final().first() == ${count}`);
				return count;
			} catch {
				// Try the next count.
			}
		}
		return 0;
	};
	expect(await pages(longDocument('cv'))).toBeGreaterThan(await pages(longDocument('resume')));
});
