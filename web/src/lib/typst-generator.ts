import type {
	ResumeData,
	WorkExperience,
	Project,
	Education,
	Leadership,
	Achievement,
	Publication,
	Presentation,
	SkillCategory,
	Clearance,
	SectionKey,
	DocumentType,
	CustomSection,
} from './types';
import { customSectionKey } from './types';
import { defaultFontSettings, defaultResumeData } from './types';
import { typstString, typstMarkup, typstNumber, typstColor, typstUrl } from './typst-escape';
import { FONT_SIZE_BOUNDS, fontFamily } from './fonts';
import {
	authorMarkup,
	citationMarkup,
	isPublicationStatus,
	publicationLinks,
	publicationStatusLabels,
	venueMarkup,
} from './publication';
import { isPresentationKind, presentationKindLabels } from './presentation';
import { bibliographyMarkup, type Bibliography } from './bibliography';

export const RESUME_CONTENT_MARKER = '// ========== RESUME CONTENT ==========';

// Dates land in Typst code position, so anything that is not a plain YYYY-MM is rejected outright
// rather than escaped.
const YEAR_MONTH = /^(\d{4})-(\d{1,2})$/;
const YEAR = /^\d{4}$/;

function parseYearMonth(dateStr: string): { year: number; month: number } | null {
	const match = YEAR_MONTH.exec(dateStr.trim());
	if (!match) return null;
	const month = Number(match[2]);
	if (month < 1 || month > 12) return null;
	return { year: Number(match[1]), month };
}

function formatDate(dateStr: string): string {
	const trimmed = dateStr.trim();
	const parsed = parseYearMonth(dateStr);
	if (!parsed) return YEAR.test(trimmed) ? `"${trimmed}"` : '""';
	return `datetime(year: ${parsed.year}, month: ${parsed.month}, day: 1)`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDisplayDate(dateStr: string): string {
	if (!dateStr) return '';
	const parsed = parseYearMonth(dateStr);
	if (!parsed) return dateStr;
	return `${MONTHS[parsed.month - 1]} ${parsed.year}`;
}

function fontSize(fonts: ResumeData['fonts'], key: keyof typeof defaultFontSettings): number {
	const [min, max] = FONT_SIZE_BOUNDS[key];
	return typstNumber(fonts[key], defaultFontSettings[key], min, max);
}

function generateProfile(summary: string): string {
	if (!summary.trim()) return '';
	return `= Profile
${typstMarkup(summary)}`;
}

function generateEducation(edu: Education): string {
	const endDate = edu.isPresent ? '"Present"' : formatDate(edu.endDate);
	const bullets = edu.bullets
		.filter((b) => b.trim())
		.map((b) => `  - ${typstMarkup(b)}`)
		.join('\n');

	return `#education-heading(
  "${typstString(edu.institution)}",
  "${typstString(edu.location)}",
  "${typstString(edu.degree)}",
  "${typstString(edu.major)}",
  ${formatDate(edu.startDate)},
  ${endDate}
)[
${bullets}
]`;
}

function generateProject(project: Project): string {
	const bullets = project.bullets
		.filter((b) => b.trim())
		.map((b) => `  - ${typstMarkup(b)}`)
		.join('\n');

	return `#project-heading(
  "${typstString(project.name)}",
  stack: "${typstString(project.stack)}",
  project-url: "${typstString(typstUrl(project.url))}",
  award: "${typstString(project.award)}"
)[
${bullets}
]`;
}

function generateWorkExperience(work: WorkExperience): string {
	const endDate = work.isPresent ? '"Present"' : formatDate(work.endDate);
	const bullets = work.bullets
		.filter((b) => b.trim())
		.map((b) => `  - ${typstMarkup(b)}`)
		.join('\n');

	return `#work-heading(
  "${typstString(work.title)}",
  "${typstString(work.company)}",
  "${typstString(work.location)}",
  ${formatDate(work.startDate)},
  ${endDate}
)[
${bullets}
]`;
}

function generateLeadership(lead: Leadership): string {
	const endDate = lead.isPresent ? '"Present"' : formatDate(lead.endDate);
	const bullets = lead.bullets
		.filter((b) => b.trim())
		.map((b) => `  - ${typstMarkup(b)}`)
		.join('\n');

	return `#work-heading(
  "${typstString(lead.title)}",
  "${typstString(lead.organization)}",
  "${typstString(lead.location)}",
  ${formatDate(lead.startDate)},
  ${endDate}
)[
${bullets}
]`;
}

function generateSkills(skills: SkillCategory[]): string {
	if (skills.length === 0) return '';

	const skillLines = skills
		.filter((s) => s.category.trim() && s.skills.trim())
		.map((s) => `- *${typstMarkup(s.category)}:* ${typstMarkup(s.skills)}`)
		.join('\n');

	if (!skillLines) return '';

	return `= Skills
#skills[
${skillLines}
]`;
}

function generateAchievements(achievements: Achievement[]): string {
	if (achievements.length === 0) return '';

	const achievementItems = achievements
		.filter((a) => a.title.trim())
		.map((a) => {
			const dateDisplay = formatDisplayDate(a.date);
			const descPart = a.description.trim() ? `\n${typstMarkup(a.description)}` : '';
			return `#achievement-heading("${typstString(a.title)}", "${typstString(dateDisplay)}")[${descPart}]`;
		})
		.join('\n\n');

	if (!achievementItems) return '';

	return `= Achievements / Certifications
${achievementItems}`;
}

// Reuses achievement-heading so existing custom templates keep compiling without a new helper.
function generateResumePublications(publications: Publication[], ownerName: string): string {
	const items = publications
		.filter((p) => p.title.trim())
		.map((p) => {
			const details = [
				p.authors.trim() ? authorMarkup(p.authors, ownerName) : '',
				venueMarkup(p),
				p.status !== 'published' && isPublicationStatus(p.status) ? publicationStatusLabels[p.status] : '',
			].filter(Boolean);
			details.push(...publicationLinks(p));
			const body = details.length ? `\n${details.join('. ')}` : '';
			return `#achievement-heading("${typstString(p.title)}", "${typstString(formatDisplayDate(p.date))}")[${body}]`;
		})
		.join('\n\n');

	if (!items) return '';

	return `= Publications
${items}`;
}

// A CV lists full references; plain numbered-list markup and Typst's bibliography need no template helper.
function generateCvPublications(
	publications: Publication[],
	ownerName: string,
	bibliography: Bibliography | null,
): string {
	const items = publications.filter((p) => p.title.trim()).map((p) => `+ ${citationMarkup(p, ownerName)}`);
	if (bibliography) items.push(bibliographyMarkup(bibliography));

	if (items.length === 0) return '';

	return `= Publications
${items.join('\n')}`;
}

function generatePresentations(presentations: Presentation[]): string {
	const items = presentations
		.filter((p) => p.title.trim())
		.map((p) => {
			const where = [p.event.trim() ? `_${typstMarkup(p.event.trim())}_` : '', typstMarkup(p.location.trim())]
				.filter(Boolean)
				.join(', ');
			const details = [where, isPresentationKind(p.kind) ? presentationKindLabels[p.kind] : ''].filter(Boolean);
			const url = typstUrl(p.url);
			if (url) details.push(`#link("${typstString(url)}")`);
			const body = details.length ? `\n${details.join('. ')}` : '';
			return `#achievement-heading("${typstString(p.title)}", "${typstString(formatDisplayDate(p.date))}")[${body}]`;
		})
		.join('\n\n');

	if (!items) return '';

	return `= Presentations
${items}`;
}

// Built only from existing helpers, so custom templates keep compiling without a new one.
function generateCustomSection(section: CustomSection): string {
	if (!section.heading.trim()) return '';
	const items = section.entries
		.filter((entry) => entry.title.trim())
		.map((entry) => {
			const bullets = entry.bullets
				.filter((b) => b.trim())
				.map((b) => `\n  - ${typstMarkup(b)}`)
				.join('');
			return `#achievement-heading("${typstString(entry.title)}", "${typstString(entry.date.trim())}")[${bullets}]`;
		})
		.join('\n\n');

	if (!items) return '';

	return `= ${typstMarkup(section.heading.trim())}
${items}`;
}

function generateClearance(clearance: Clearance[]): string {
	if (clearance.length === 0) return '';

	const items = clearance
		.filter((c) => c.level)
		.map((c) => {
			const dateDisplay = formatDisplayDate(c.dateGranted);
			return `#achievement-heading("${typstString(c.level)} (${typstString(c.status)})", "${typstString(dateDisplay)}")[]`;
		})
		.join('\n\n');

	if (!items) return '';

	return `= Clearance
${items}`;
}

// Running header and "page N of M" footer; the first page already carries the name at the top.
const CV_PAGE_DECORATIONS = `
    header: context {
      if here().page() > 1 {
        set text(0.85em, fill: text-color.lighten(35%))
        grid(columns: (1fr, auto), author-name, [Curriculum Vitae])
      }
    },
    footer: context {
      set text(0.85em, fill: text-color.lighten(35%))
      align(center)[Page #counter(page).display() of #counter(page).final().first()]
    },`;

// Several pages read better with more room between entries than the dense one-page layout allows.
const CV_SPACING = `
  set par(spacing: 1.1em)
`;

/** The page setup wrapper; a CV gets real margins, looser spacing, a running header, and page numbers. */
function resumeFunction(documentType: DocumentType): string {
	const cv = documentType === 'cv';
	return `#let resume(
  paper: "a4",
  top-margin: ${cv ? '0.75in' : '0.15in'},
  bottom-margin: ${cv ? '0.75in' : '0.15in'},
  left-margin: ${cv ? '0.8in' : '0.15in'},
  right-margin: ${cv ? '0.8in' : '0.15in'},
  font-size: font-size,
  personal-info-font-size: personal-info-font-size,
  author-name: "",
  author-position: center,
  personal-info-position: center,
  phone: "",
  location: "",
  email: "",
  website: "",
  linkedin-user-id: "",
  github-username: "",

  body
) = {
  set document(
    title: "${cv ? 'Curriculum Vitae' : 'Resume'} | " + author-name,
    author: author-name,
    keywords: "${cv ? 'cv, curriculum vitae' : 'cv, resume'}",
    date: datetime.today()
  )

  set page(
    paper: paper,
    margin: (
      top: top-margin, bottom: bottom-margin,
      left: left-margin, right: right-margin
    ),${cv ? CV_PAGE_DECORATIONS : ''}
  )

  set text(
    font: body-font, size: font-size, lang: "en", ligatures: false, fill: text-color
  )
${cv ? CV_SPACING : ''}
  show heading.where(level: 1): it => block(width: 100%${cv ? ', above: 1.4em, below: 0.8em' : ''})[
    #set text(heading-size, font: heading-font, weight: "regular", fill: acct-color)
    #smallcaps(it.body)
    #v(-1.0em)
    #line(length: 100%, stroke: stroke(thickness: 0.4pt, paint: acct-color))
    #v(-0.2em)
  ]

  let contact_item(value, link-type: "", prefix: "") = {
    if value != "" {
      if link-type != "" {
        underline(offset: 0.3em)[#link2(link-type + value)[#text(prefix + value)]]
      } else {
        value
      }
    }
  }

  align(author-position, [
    #grid(
      columns: (1fr, auto),
      gutter: 0.6em,
    )[
      #grid(
        rows: 2,
      )[
        #align(center, [
          #grid(columns: 1,
          column-gutter: 20pt,
          align: center,

          upper(text(title-size, font: heading-font, weight: "bold", fill: head-color)[#author-name]),
        )[
          #v(-0.2em)
        ]
      ])
      #v(0.4em)

      #align(center, text(personal-info-font-size)[
          #{
            let sepSpace = 0.2em
            let items = (
              contact_item(email, link-type: "mailto:"),
              contact_item(website, link-type: "https://"),
              contact_item(
                linkedin-user-id,
                link-type: "https://linkedin.com/in/",
                prefix: "linkedin.com/in/",
              ),
              contact_item(
                github-username,
                link-type: "https://github.com/",
                prefix: "github.com/",
              ),
              contact_item(phone),
            )
            items.filter(x => x != none).join([
              #show "|": sep => {
                h(sepSpace)
                [|]
                h(sepSpace)
              }
              |
            ])
          }
        ])
      ]
    ]
  ])
  v(-1em)
  body
}`;
}

/**
 * Combines sanitized resume content with a compatible custom template or the built-in default. A
 * bibliography is only rendered in a CV.
 */
export function generateTypstCode(
	data: ResumeData,
	customTemplate?: string | null,
	bibliography: Bibliography | null = null,
): string {
	const {
		documentType,
		personalInfo,
		profile,
		clearance,
		education,
		projects,
		workExperience,
		leadership,
		skills,
		achievements,
		publications,
		publicationAuthorName,
		presentations,
		colors,
		fonts,
		fontFamilies,
		sectionOrder,
		customSections,
	} = data;

	const filledEducation = education.filter((e) => e.institution.trim() || e.degree.trim() || e.major.trim());
	const filledProjects = projects.filter((p) => p.name.trim());
	const filledExperience = workExperience.filter((w) => w.title.trim() || w.company.trim());
	const filledLeadership = leadership.filter((l) => l.title.trim() || l.organization.trim());

	const sections: Record<SectionKey, string> = {
		profile: generateProfile(profile.summary),
		clearance: generateClearance(clearance),
		education: filledEducation.length > 0 ? `= Education\n${filledEducation.map(generateEducation).join('\n\n')}` : '',
		projects: filledProjects.length > 0 ? `= Projects\n${filledProjects.map(generateProject).join('\n\n')}` : '',
		experience:
			filledExperience.length > 0 ? `= Experience\n${filledExperience.map(generateWorkExperience).join('\n\n')}` : '',
		leadership:
			filledLeadership.length > 0 ? `= Leadership\n${filledLeadership.map(generateLeadership).join('\n\n')}` : '',
		skills: generateSkills(skills),
		achievements: generateAchievements(achievements),
		publications:
			documentType === 'cv'
				? generateCvPublications(publications, publicationAuthorName, bibliography)
				: generateResumePublications(publications, publicationAuthorName),
		presentations: generatePresentations(presentations),
	};
	for (const section of customSections) sections[customSectionKey(section.id)] = generateCustomSection(section);

	// Generate sections in the specified order
	const orderedSections = sectionOrder
		.map((id) => sections[id] ?? '')
		.filter((section) => section.trim() !== '')
		.join('\n\n');

	const defaults = defaultResumeData.colors;

	const defaultCode = `#let head-color = rgb("${typstColor(colors.headColor, defaults.headColor)}")
#let text-color = rgb("${typstColor(colors.textColor, defaults.textColor)}")
#let acct-color = rgb("${typstColor(colors.accentColor, defaults.accentColor)}")
#let link-color = rgb("${typstColor(colors.linkColor, defaults.linkColor)}")
#let font-size = ${fontSize(fonts, 'baseSize')}pt
#let personal-info-font-size = ${fontSize(fonts, 'contactSize')}pt
#let heading-size = ${fontSize(fonts, 'headingSize')}pt
#let title-size = ${fontSize(fonts, 'nameSize')}pt
#let heading-font = "${typstString(fontFamily(fontFamilies?.heading))}"
#let body-font = "${typstString(fontFamily(fontFamilies?.body))}"

#let bold(body) = {
  text(weight: 700)[#body]
}

#let link2(target, body) = {
  link(target, text(fill: link-color)[#body])
}

${resumeFunction(documentType)}

#let generic_2x2(cols, r1c1, r1c2, r2c1, r2c2) = {
  grid(
    columns: cols,
    gutter: 0.5em,
    align(left)[#r1c1 \\ #r2c1],
    align(right)[#r1c2 \\ #r2c2]
  )
}

#let skills(body) = {
  if body != [] {
    set par(leading: 0.6em)
    set list(
      body-indent: 0.1em,
      indent: 0em,
      spacing: 0.7em,
      marker: []
    )
    body
  }
}

#let period_worked(start-date, end-date) = {
  let display-date(value) = if type(value) == str { value } else { value.display("[month repr:short] [year]") }
  let start = display-date(start-date)
  let finish = display-date(end-date)
  if start == "" { finish } else if finish == "" { start } else { [#start - #finish] }
}

#let work-heading(title, company, location, start-date, end-date, body) = {
  generic_2x2(
    (65%, 35%),
    [#bold(title)], [#bold(period_worked(start-date, end-date))],
    [#company], location
  )
  v(-0.2em)
  if body != [] {
    v(-0.5em)
    set par(leading: 0.6em)
    set list(indent: 1.0em)
    body
  }
}

#let project-heading(name, stack: "", project-url: "", award: "", body) = {
  if project-url.len() != 0 { underline(offset: .3em, link2(project-url)[#bold(name)]) } else {
    [#bold(name)]
  }
  if stack != "" {
    [
      #show "|": sep => { h(0.3em); [|]; h(0.3em) }
      |#bold(stack)
    ]
  }
  if award != "" {
    [- #award]
  }
  v(-0.2em)
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    set list(indent: 1.0em)
    body
  }
}

#let education-heading(institution, location, degree, major, start-date, end-date, body) = {
  let degree-line = if degree != "" and major != "" {
    [#degree, #major]
  } else if degree != "" {
    [#degree]
  } else if major != "" {
    [#major]
  } else {
    []
  }
  generic_2x2(
    (70%, 30%),
    [#bold(institution)], [#bold(location)],
    degree-line, period_worked(start-date, end-date)
  )
  v(-0.2em)
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    set list(indent: 0.5em)
    body
  }
}

#let achievement-heading(title, date, body) = {
  [#bold(title)]
  if date != "" {
    [ | #date]
  }
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    body
  }
  v(-0.2em)
}

${RESUME_CONTENT_MARKER}

#show: resume.with(
  author-name: "${typstString(personalInfo.name)}",
  email: "${typstString(personalInfo.email)}",
  phone: "${typstString(personalInfo.phone)}",
  website: "${typstString(personalInfo.website)}",
  linkedin-user-id: "${typstString(personalInfo.linkedin)}",
  github-username: "${typstString(personalInfo.github)}",
)

${orderedSections}
`;

	if (!customTemplate) return defaultCode;

	const customMarkerIndex = customTemplate.indexOf(RESUME_CONTENT_MARKER);
	if (customMarkerIndex === -1) return defaultCode;

	const generatedMarkerIndex = defaultCode.indexOf(RESUME_CONTENT_MARKER);
	const customPreamble = customTemplate.slice(0, customMarkerIndex).trimEnd();
	const generatedContent = defaultCode.slice(generatedMarkerIndex + RESUME_CONTENT_MARKER.length).trimStart();

	return `${customPreamble}\n\n${RESUME_CONTENT_MARKER}\n\n${generatedContent}`;
}

/** Keeps the styling choices but drops every piece of resume content, so the result is safe to share. */
function withoutResumeContent(data: ResumeData): ResumeData {
	return {
		...defaultResumeData,
		documentType: data.documentType,
		colors: data.colors,
		fonts: data.fonts,
		fontFamilies: data.fontFamilies,
		sectionOrder: data.sectionOrder,
	};
}

/** Generates the active template with the user's styling and no resume content. */
export function generateTypstTemplate(data: ResumeData, customTemplate?: string | null): string {
	return generateTypstCode(withoutResumeContent(data), customTemplate);
}

/** True when any resume content, including a CV bibliography, would appear in the generated Typst source. */
export function hasResumeContent(data: ResumeData, bibliography: Bibliography | null = null): boolean {
	return generateTypstCode(data, null, bibliography) !== generateTypstTemplate(data);
}

/** Picks the Typst download payload: the full resume, or the content-free template when there is nothing to export. */
export function typstDownload(
	data: ResumeData,
	customTemplate?: string | null,
	bibliography: Bibliography | null = null,
): { source: string; filename: string } {
	const fallbackName = data.documentType === 'cv' ? 'cv' : 'resume';
	if (!hasResumeContent(data, bibliography)) {
		return { source: generateTypstTemplate(data, customTemplate), filename: `${fallbackName}-template.typ` };
	}
	return {
		source: generateTypstCode(data, customTemplate, bibliography),
		filename: `${data.personalInfo.name.trim() || fallbackName}.typ`,
	};
}
