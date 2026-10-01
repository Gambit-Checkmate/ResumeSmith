export const MIN_PREVIEW_ZOOM = 50;
export const MAX_PREVIEW_ZOOM = 200;
export const PREVIEW_ZOOM_STEP = 25;
export const BASE_PREVIEW_WIDTH = 510;

/** A null zoom fits the page to the available width. */
export function previewWidth(availableWidth: number, zoom: number | null): number {
	return zoom === null ? Math.max(1, availableWidth) : (BASE_PREVIEW_WIDTH * zoom) / 100;
}

export function stepPreviewZoom(zoom: number | null, direction: -1 | 1): number {
	const current = zoom ?? 100;
	return Math.max(MIN_PREVIEW_ZOOM, Math.min(MAX_PREVIEW_ZOOM, current + direction * PREVIEW_ZOOM_STEP));
}
