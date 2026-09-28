import { describe, it, expect } from 'vitest';
import {
	generateTypstCode,
	generateTypstTemplate,
	hasResumeContent,
	typstDownload,
	RESUME_CONTENT_MARKER,
} from './typst-generator';
import { defaultResumeData, defaultFontSettings } from './types';
import type { ResumeData, WorkExperience } from './types';

function baseData(clearance: ResumeData['clearance']): ResumeData {
	return { ...structuredClone(defaultResumeData), clearance };
}

describe('generateTypstCode clearance section', () => {
	it('omits the Clearance heading when there are no entries', () => {
		const code = generateTypstCode(baseData([]));
		expect(code).not.toContain('= Clearance');
	});

	it('renders level, status, and date for each entry', () => {
		const code = generateTypstCode(
			baseData([{ id: '1', level: 'Top Secret/SCI', status: 'Active', dateGranted: '2023-03' }]),
		);
		expect(code).toContain('= Clearance');
		expect(code).toContain('#achievement-heading("Top Secret/SCI (Active)", "Mar 2023")[]');
	});

	it('places Clearance before Education per the default section order', () => {
		const data = baseData([{ id: '1', level: 'Secret', status: 'Eligible', dateGranted: '' }]);
		data.education = [
			{
				id: 'e1',
				institution: 'MIT',
				location: '',
				degree: '',
				major: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [],
			},
		];
		const code = generateTypstCode(data);
		expect(code.indexOf('= Clearance')).toBeLessThan(code.indexOf('= Education'));
	});
});

describe('generateTypstCode publications section', () => {
	const paper = {
		id: 'p1',
		title: 'Fast Parsing',
		authors: 'A. Test',
		venue: 'Journal of Tests',
		date: '2022-05',
		url: '',
	};

	it('omits the Publications heading when no entry has a title', () => {
		const code = generateTypstCode(withOverrides({ publications: [{ ...paper, title: ' ' }] }));
		expect(code).not.toContain('= Publications');
	});

	it('renders title, date, authors, and an italic venue', () => {
		const content = contentOf(withOverrides({ publications: [paper] }));
		expect(content).toContain('= Publications');
		expect(content).toContain('#achievement-heading("Fast Parsing", "May 2022")[\nA. Test. _Journal of Tests_]');
	});

	it('links a safe URL and drops a javascript URL', () => {
		const safe = contentOf(withOverrides({ publications: [{ ...paper, url: 'doi.org/10.1/x' }] }));
		expect(safe).toContain('#link("https://doi.org/10.1/x")');
		const unsafe = contentOf(withOverrides({ publications: [{ ...paper, url: 'javascript:alert(1)' }] }));
		expect(unsafe).not.toContain('javascript');
		expect(unsafe).not.toContain('#link(');
	});

	it('escapes markup in publication fields', () => {
		const content = contentOf(withOverrides({ publications: [{ ...paper, venue: 'Conf] #eval("1")' }] }));
		expect(content).toContain(String.raw`_Conf\] \#eval(\"1\")_`);
	});
});

describe('generateTypstCode font families', () => {
	it('applies the chosen heading and body fonts', () => {
		const code = generateTypstCode(withOverrides({ fontFamilies: { heading: 'Lato', body: 'Carlito' } }));
		expect(code).toContain('#let heading-font = "Lato"');
		expect(code).toContain('#let body-font = "Carlito"');
		expect(code).toContain('font: body-font, size: font-size');
		expect(code).toContain('#set text(heading-size, font: heading-font');
		expect(code).toContain('text(title-size, font: heading-font');
	});

	it('falls back to the default font for a value outside the curated list', () => {
		const code = generateTypstCode(
			withOverrides({ fontFamilies: { heading: 'Lato"); #eval("1+1', body: 'Wingdings' } }),
		);
		expect(code).not.toContain('eval');
		expect(code).toContain('#let heading-font = "Libertinus Serif"');
		expect(code).toContain('#let body-font = "Libertinus Serif"');
	});
});

describe('custom Typst templates', () => {
	it('uses the uploaded preamble and generated resume content', () => {
		const customTemplate = `#let custom-style = true\n${RESUME_CONTENT_MARKER}\nThis is replaced`;
		const data = withOverrides({ personalInfo: { ...defaultResumeData.personalInfo, name: 'Ada Lovelace' } });
		const code = generateTypstCode(data, customTemplate);

		expect(code).toContain('#let custom-style = true');
		expect(code).toContain('author-name: "Ada Lovelace"');
		expect(code).not.toContain('This is replaced');
		expect(code).not.toContain('#let head-color');
	});

	it('falls back to the built-in template when the marker is absent', () => {
		const code = generateTypstCode(baseData([]), '#let custom-style = true');
		expect(code).toContain('#let head-color');
		expect(code).not.toContain('#let custom-style');
	});
});

function withOverrides(overrides: Partial<ResumeData>): ResumeData {
	return { ...structuredClone(defaultResumeData), ...overrides };
}

// The template preamble contains strings like `project-url: ""` and `datetime.today()` as function
// defaults, so assertions about user data have to look at the generated content only.
function contentOf(data: ResumeData): string {
	const [, content] = generateTypstCode(data).split('// ========== RESUME CONTENT ==========');
	if (content === undefined) throw new Error('content marker missing from generated Typst');
	return content;
}

function oneJob(overrides: Partial<WorkExperience>): WorkExperience {
	return {
		id: 'w1',
		title: 'Engineer',
		company: 'Acme',
		location: '',
		startDate: '',
		endDate: '',
		isPresent: true,
		bullets: [],
		...overrides,
	};
}

describe('generateTypstCode sanitization', () => {
	it('escapes a closing bracket in a bullet so it cannot end the content block', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ bullets: ['shipped it] #eval("1+1") ['] })] }));
		expect(content).toContain(String.raw`shipped it\] \#eval(\"1\+1\") \[`);
		expect(content).not.toMatch(/[^\\]\] #eval/);
	});

	it('escapes emphasis markers in a bullet instead of rendering them as formatting', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ bullets: ['grew *sales* by _30_'] })] }));
		expect(content).toContain(String.raw`grew \*sales\* by \_30\_`);
	});

	it('encodes a backslash in a bullet as a codepoint rather than a linebreak', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ bullets: ['ran C:\\build'] })] }));
		expect(content).toContain(String.raw`ran C:\u{5C}build`);
	});

	it('renders a hash in a string field without a stray backslash', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ title: 'C# Developer' })] }));
		expect(content).toContain('"C# Developer"');
	});

	it('closes a quote-based breakout in a string field', () => {
		const content = contentOf(
			withOverrides({ personalInfo: { ...defaultResumeData.personalInfo, name: 'Bob", author: "evil' } }),
		);
		expect(content).toContain(String.raw`author-name: "Bob\", author: \"evil"`);
	});

	it('rejects a date that is not a plain year-month', () => {
		const payload = '2020, month: 1, day: 1) ; let pwned = eval("1+1") ; datetime(year: 2021-01';
		const content = contentOf(withOverrides({ workExperience: [oneJob({ startDate: payload })] }));
		expect(content).not.toContain('pwned');
		expect(content).toContain('  "",\n  "Present"');
		expect(content).not.toContain('datetime.today()');
	});

	it('rejects an out-of-range month', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ startDate: '2020-13' })] }));
		expect(content).not.toContain('month: 13');
		expect(content).not.toContain('datetime.today()');
	});

	it('renders a year-only date as the stated year', () => {
		const content = contentOf(
			withOverrides({ workExperience: [oneJob({ startDate: '2019', endDate: '2021', isPresent: false })] }),
		);
		expect(content).toContain('"2019"');
		expect(content).toContain('"2021"');
		expect(content).not.toContain('datetime.today()');
	});

	it('renders blank inactive dates as blank values', () => {
		const content = contentOf(
			withOverrides({ workExperience: [oneJob({ startDate: '', endDate: '', isPresent: false })] }),
		);
		expect(content).toContain('  "",\n  ""');
		expect(content).not.toContain('datetime.today()');
		expect(content).not.toContain('"Present"');
	});

	it('still renders a valid date', () => {
		const content = contentOf(withOverrides({ workExperience: [oneJob({ startDate: '2020-03' })] }));
		expect(content).toContain('datetime(year: 2020, month: 3, day: 1)');
	});

	it('falls back to the default colour when a colour carries a payload', () => {
		const code = generateTypstCode(
			withOverrides({ colors: { ...defaultResumeData.colors, headColor: '000"); #eval("1+1"); rgb("000' } }),
		);
		expect(code).not.toContain('eval');
		expect(code).toContain('#let head-color = rgb("22227f")');
	});

	it('clamps a font size instead of interpolating it raw', () => {
		const code = generateTypstCode(
			withOverrides({
				fonts: { ...defaultResumeData.fonts, baseSize: 9000, nameSize: '1pt); #eval("1+1"); (' as unknown as number },
			}),
		);
		expect(code).not.toContain('eval');
		expect(code).toContain('#let font-size = 14pt');
		expect(code).toContain(`#let title-size = ${defaultFontSettings.nameSize}pt`);
	});

	it('drops a javascript URL on a project link', () => {
		const content = contentOf(
			withOverrides({
				projects: [{ id: 'p1', name: 'Thing', stack: '', url: 'javascript:alert(1)', award: '', bullets: [] }],
			}),
		);
		expect(content).toContain('project-url: ""');
		expect(content).not.toContain('javascript');
	});

	it('assumes https for a bare project domain', () => {
		const content = contentOf(
			withOverrides({
				projects: [{ id: 'p1', name: 'Thing', stack: '', url: 'example.com/x', award: '', bullets: [] }],
			}),
		);
		expect(content).toContain('project-url: "https://example.com/x"');
	});
});

describe('typst download payload', () => {
	const customTemplate = `#let custom-marker = 1\n${RESUME_CONTENT_MARKER}\n`;

	function filledData(): ResumeData {
		const data = structuredClone(defaultResumeData);
		data.personalInfo.name = 'Jordan Example';
		data.personalInfo.email = 'jordan@example.com';
		data.profile.summary = 'Synthetic summary text.';
		data.skills = [{ id: 's1', category: 'Languages', skills: 'TypeScript' }];
		data.colors.accentColor = '#123456';
		return data;
	}

	it('treats default data and unrendered fields as having no content', () => {
		const data = structuredClone(defaultResumeData);
		expect(hasResumeContent(data)).toBe(false);
		data.personalInfo.location = 'Nowhere';
		data.workExperience = [
			{
				id: 'w1',
				title: '',
				company: '',
				location: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: ['Orphan bullet'],
			},
		];
		expect(hasResumeContent(data)).toBe(false);
	});

	it('detects any rendered content', () => {
		const data = structuredClone(defaultResumeData);
		data.personalInfo.email = 'someone@example.com';
		expect(hasResumeContent(data)).toBe(true);
	});

	it('downloads the full resume source when content exists', () => {
		const data = filledData();
		expect(typstDownload(data, customTemplate)).toEqual({
			source: generateTypstCode(data, customTemplate),
			filename: 'Jordan Example.typ',
		});
	});

	it('falls back to the active template when there is no content', () => {
		const data = structuredClone(defaultResumeData);
		data.colors.accentColor = '#123456';
		const { source, filename } = typstDownload(data, customTemplate);
		expect(filename).toBe('resume-template.typ');
		expect(source).toContain('#let custom-marker = 1');
		expect(source).toContain(RESUME_CONTENT_MARKER);
	});

	it('keeps styling but strips every piece of resume content from the template', () => {
		const data = filledData();
		const template = generateTypstTemplate(data);
		expect(template).toContain('acct-color = rgb("123456")');
		expect(template).toContain(RESUME_CONTENT_MARKER);
		for (const value of ['Jordan Example', 'jordan@example.com', 'Synthetic summary text.', 'TypeScript']) {
			expect(template).not.toContain(value);
		}
		expect(template).toBe(generateTypstTemplate(structuredClone({ ...defaultResumeData, colors: data.colors })));
	});
});

describe('academic CV template', () => {
	const cv = (): ResumeData => withOverrides({ documentType: 'cv' });

	it('numbers pages and adds a running header only for a CV', () => {
		const cvCode = generateTypstCode(cv());
		expect(cvCode).toContain('Page #counter(page).display() of #counter(page).final().first()');
		expect(cvCode).toContain('[Curriculum Vitae]');
		expect(cvCode).toContain('title: "Curriculum Vitae | " + author-name');
		const resumeCode = generateTypstCode(withOverrides({}));
		expect(resumeCode).not.toContain('counter(page)');
		expect(resumeCode).toContain('title: "Resume | " + author-name');
		expect(resumeCode).toContain('top-margin: 0.15in');
	});

	it('uses the same content helpers, so section content is identical in both documents', () => {
		const data = cv();
		data.profile.summary = 'Synthetic *summary*.';
		expect(contentOf(data)).toBe(contentOf({ ...data, documentType: 'resume' }));
	});

	it('keeps the CV layout in the content-free template and names downloads after the document', () => {
		const data = cv();
		expect(generateTypstTemplate(data)).toContain('[Curriculum Vitae]');
		expect(typstDownload(data).filename).toBe('cv-template.typ');
		data.profile.summary = 'Synthetic summary.';
		expect(typstDownload(data).filename).toBe('cv.typ');
	});
});
