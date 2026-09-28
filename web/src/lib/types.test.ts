import { describe, it, expect } from 'vitest';
import { defaultResumeData, defaultSectionOrder, sectionLabel, sectionLabels } from './types';

describe('clearance defaults', () => {
	it('defaultResumeData includes an empty clearance array', () => {
		expect(defaultResumeData.clearance).toEqual([]);
	});

	it('defaultSectionOrder places clearance right after profile', () => {
		const profileIndex = defaultSectionOrder.indexOf('profile');
		expect(defaultSectionOrder[profileIndex + 1]).toBe('clearance');
	});

	it('sectionLabels has a label for clearance', () => {
		expect(sectionLabels.clearance).toBe('Clearance');
	});
});

describe('sectionLabel', () => {
	const custom = [{ id: 'a', heading: ' Grants ', entries: [] }];

	it('labels built-in sections and named custom sections', () => {
		expect(sectionLabel('publications', custom)).toBe('Publications');
		expect(sectionLabel('custom:a', custom)).toBe('Grants');
	});

	it('labels an unnamed or missing custom section', () => {
		expect(sectionLabel('custom:a', [{ id: 'a', heading: '', entries: [] }])).toBe('Untitled section');
		expect(sectionLabel('custom:b', custom)).toBe('Untitled section');
	});
});
