import { describe, expect, it } from 'vitest';
import { nextMenuIndex } from './menu-navigation';

describe('menu navigation', () => {
	it('moves to the adjacent item', () => {
		expect(nextMenuIndex('ArrowDown', 0, 4)).toBe(1);
		expect(nextMenuIndex('ArrowUp', 2, 4)).toBe(1);
	});

	it('wraps at both ends', () => {
		expect(nextMenuIndex('ArrowDown', 3, 4)).toBe(0);
		expect(nextMenuIndex('ArrowUp', 0, 4)).toBe(3);
	});

	it('jumps to the first and last item', () => {
		expect(nextMenuIndex('Home', 2, 4)).toBe(0);
		expect(nextMenuIndex('End', 1, 4)).toBe(3);
	});

	it('enters from the matching end when no item is focused or the index is stale', () => {
		expect(nextMenuIndex('ArrowDown', -1, 4)).toBe(0);
		expect(nextMenuIndex('ArrowUp', -1, 4)).toBe(3);
		expect(nextMenuIndex('ArrowDown', 9, 4)).toBe(0);
		expect(nextMenuIndex('ArrowUp', 9, 4)).toBe(3);
		expect(nextMenuIndex('ArrowDown', 1.5, 4)).toBe(0);
	});

	it('stays on a single item', () => {
		expect(nextMenuIndex('ArrowDown', 0, 1)).toBe(0);
		expect(nextMenuIndex('ArrowUp', 0, 1)).toBe(0);
	});

	it('ignores other keys and empty menus', () => {
		expect(nextMenuIndex('Enter', 0, 4)).toBeNull();
		expect(nextMenuIndex('Tab', 0, 4)).toBeNull();
		expect(nextMenuIndex('ArrowDown', 0, 0)).toBeNull();
		expect(nextMenuIndex('End', 0, -1)).toBeNull();
		expect(nextMenuIndex('Home', 0, Number.NaN)).toBeNull();
	});
});
