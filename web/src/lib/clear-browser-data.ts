import { BIBLIOGRAPHY_STORAGE_KEY } from './bibliography-store';
import { ONET_STORAGE_KEY } from './onet-store';
import { RESUME_STORAGE_KEY } from './resume-backup';
import { templateStorageKey } from './template-store';

export const OWNED_LOCAL_STORAGE_KEYS = [RESUME_STORAGE_KEY, ONET_STORAGE_KEY, BIBLIOGRAPHY_STORAGE_KEY] as const;
export const OWNED_SESSION_STORAGE_KEYS = [templateStorageKey('resume'), templateStorageKey('cv')] as const;

export interface StorageRemovalResult {
	removed: string[];
	failed: string[];
}

/** Removes only ResumeSmith-owned keys and verifies each removal. */
export function removeOwnedStorageKeys(
	storage: Pick<Storage, 'getItem' | 'removeItem'>,
	keys: readonly string[],
): StorageRemovalResult {
	const removed: string[] = [];
	const failed: string[] = [];
	for (const key of keys) {
		try {
			storage.removeItem(key);
			if (storage.getItem(key) !== null) failed.push(key);
			else removed.push(key);
		} catch {
			failed.push(key);
		}
	}
	return { removed, failed };
}

export function clearResumeSmithBrowserStorage(
	local: Pick<Storage, 'getItem' | 'removeItem'>,
	session: Pick<Storage, 'getItem' | 'removeItem'>,
) {
	return {
		local: removeOwnedStorageKeys(local, OWNED_LOCAL_STORAGE_KEYS),
		session: removeOwnedStorageKeys(session, OWNED_SESSION_STORAGE_KEYS),
	};
}
