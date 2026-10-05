export interface EditorTab {
	id: string;
	label: string;
}

export interface TabGroups {
	/** Document content that most documents use, always visible. */
	primary: EditorTab[];
	/** Less common document content, tucked behind a disclosure. */
	more: EditorTab[];
	/** Presentation settings rather than document content. */
	appearance: EditorTab[];
}

const appearanceIds = new Set(['layout', 'fonts', 'colors']);
const moreIds = new Set(['clearance', 'leadership', 'achievements', 'publications', 'presentations', 'custom']);

/**
 * Splits editor sections into three groups, keeping the given order within each. Unknown ids land in
 * `primary` so a newly added section is visible by default; every tab appears in exactly one group.
 */
export function groupTabs(tabs: EditorTab[]): TabGroups {
	return {
		primary: tabs.filter((tab) => !appearanceIds.has(tab.id) && !moreIds.has(tab.id)),
		more: tabs.filter((tab) => moreIds.has(tab.id)),
		appearance: tabs.filter((tab) => appearanceIds.has(tab.id)),
	};
}
