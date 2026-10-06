export const MIN_PREVIEW_ZOOM = 50;
export const MAX_PREVIEW_ZOOM = 200;
export const PREVIEW_ZOOM_STEP = 25;
export const BASE_PREVIEW_WIDTH = 510;

export type PreviewZoom = number | null | 'page';

/** Null fits the width; page fits both dimensions without enlarging the initial preview. */
export function previewWidth(
	availableWidth: number,
	zoom: PreviewZoom,
	availableHeight = Infinity,
	aspectRatio = 1,
): number {
	if (zoom === 'page') return Math.max(1, Math.min(availableWidth, availableHeight * aspectRatio, BASE_PREVIEW_WIDTH));
	return zoom === null ? Math.max(1, availableWidth) : (BASE_PREVIEW_WIDTH * zoom) / 100;
}

export function stepPreviewZoom(current: number, direction: -1 | 1): number {
	const next =
		direction === 1
			? (Math.floor(current / PREVIEW_ZOOM_STEP) + 1) * PREVIEW_ZOOM_STEP
			: (Math.ceil(current / PREVIEW_ZOOM_STEP) - 1) * PREVIEW_ZOOM_STEP;
	return Math.max(MIN_PREVIEW_ZOOM, Math.min(MAX_PREVIEW_ZOOM, next));
}
