/**
 * Return the item a menu should focus after a navigation key, wrapping at both ends, or null when the key does not
 * move focus. `current` is -1 when focus is not on an item yet.
 */
export function nextMenuIndex(key: string, current: number, count: number): number | null {
	if (!Number.isInteger(count) || count <= 0) return null;
	const index = Number.isInteger(current) && current >= 0 && current < count ? current : -1;
	switch (key) {
		case 'ArrowDown':
			return (index + 1) % count;
		case 'ArrowUp':
			return index <= 0 ? count - 1 : index - 1;
		case 'Home':
			return 0;
		case 'End':
			return count - 1;
		default:
			return null;
	}
}
