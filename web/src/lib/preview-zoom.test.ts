import { describe, expect, it } from 'vitest';
import { previewWidth, stepPreviewZoom } from './preview-zoom';

describe('preview zoom', () => {
	it('fits the whole initial page to both dimensions, including mixed page sizes', () => {
		expect(previewWidth(780, 'page', 400, 0.75)).toBe(300);
		expect(previewWidth(320, 'page', 700, 0.75)).toBe(320);
		expect(previewWidth(900, 'page', 1000, 0.75)).toBe(510);
		expect(previewWidth(780, 'page', 400, 1.5)).toBe(510);
		expect(previewWidth(0, 'page', 0, 0.75)).toBe(1);
		expect(previewWidth(320, 150, 200, 0.75)).toBe(765);
	});
	it('fits the page to panel changes and keeps explicit zoom independent of panel size', () => {
		expect(previewWidth(320, null)).toBe(320);
		expect(previewWidth(780, null)).toBe(780);
		expect(previewWidth(320, 150)).toBe(765);
		expect(previewWidth(780, 150)).toBe(765);
	});

	it('steps from fit mode and respects both zoom boundaries', () => {
		expect(stepPreviewZoom(140, 1)).toBe(150);
		expect(stepPreviewZoom(140, -1)).toBe(125);
		expect(stepPreviewZoom(60, 1)).toBe(75);
		expect(stepPreviewZoom(60, -1)).toBe(50);
		expect(stepPreviewZoom(100, 1)).toBe(125);
		expect(stepPreviewZoom(100, -1)).toBe(75);
		expect(stepPreviewZoom(50, -1)).toBe(50);
		expect(stepPreviewZoom(200, 1)).toBe(200);
	});
});
