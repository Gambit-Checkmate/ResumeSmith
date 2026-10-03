import { swapIndexedHighlights } from './ai-highlight';

export type MoveDirection = -1 | 1;

/** Return a new array with one adjacent move, or the original array at a boundary. */
export function moveAt<T>(items: T[], index: number, direction: MoveDirection): T[] {
	const target = index + direction;
	if (!Number.isInteger(index) || index < 0 || index >= items.length || target < 0 || target >= items.length)
		return items;
	const next = [...items];
	[next[index], next[target]] = [next[target], next[index]];
	return next;
}

/** Keep index-based AI highlights on their original content after a move. */
export function moveWithHighlights<T>(items: T[], path: string, index: number, direction: MoveDirection): T[] {
	const moved = moveAt(items, index, direction);
	if (moved !== items) swapIndexedHighlights(path, index, index + direction);
	return moved;
}
