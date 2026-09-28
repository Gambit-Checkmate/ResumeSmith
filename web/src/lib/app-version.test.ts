import { describe, expect, it } from 'vitest';
import { DEV_VERSION, pullRequestNumber, resolveAppVersion } from './app-version';

const buildDate = new Date('2026-09-28T23:30:00Z');

describe('pullRequestNumber', () => {
	it('reads squash merge subjects', () => {
		expect(pullRequestNumber('feat(export): add Typst source download (#66)')).toBe(66);
	});

	it('reads merge commit subjects', () => {
		expect(pullRequestNumber('Merge pull request #12 from user/branch\n\nfeat: thing')).toBe(12);
	});

	it('uses the trailing reference when a subject mentions several', () => {
		expect(pullRequestNumber('revert "fix: thing (#3)" (#9)')).toBe(9);
	});

	it('ignores references outside the subject line', () => {
		expect(pullRequestNumber('fix: thing\n\nFollow-up to (#5)')).toBeNull();
	});

	it('returns null for direct pushes and missing messages', () => {
		expect(pullRequestNumber('feat(AI): update all model invocations')).toBeNull();
		expect(pullRequestNumber('')).toBeNull();
		expect(pullRequestNumber(undefined)).toBeNull();
	});
});

describe('resolveAppVersion', () => {
	it('formats production builds as UTC date plus PR number', () => {
		expect(resolveAppVersion({ vercelEnv: 'production', commitMessage: 'fix: thing (#7)', buildDate })).toBe(
			'2026.09.28.7',
		);
	});

	it('reports Dev outside production', () => {
		for (const vercelEnv of ['preview', 'development', undefined, '']) {
			expect(resolveAppVersion({ vercelEnv, commitMessage: 'fix: thing (#7)', buildDate })).toBe(DEV_VERSION);
		}
	});

	it('falls back to the short commit SHA for production builds without a PR', () => {
		expect(
			resolveAppVersion({
				vercelEnv: 'production',
				commitMessage: 'chore: direct push',
				commitSha: 'e89ec73abcdef0123456789',
				buildDate,
			}),
		).toBe('2026.09.28+e89ec73');
	});

	it('falls back to the date alone when no commit metadata is available', () => {
		expect(resolveAppVersion({ vercelEnv: 'production', buildDate })).toBe('2026.09.28');
	});
});
