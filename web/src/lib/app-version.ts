/**
 * Build-time version label shown in the footer.
 *
 * Production deployments are versioned `YYYY.MM.DD.PR`, using the UTC build date and
 * the pull request number GitHub writes into the merge commit message. Every other
 * environment (preview deployments, local dev) reports `Dev`. Runs in vite.config.ts,
 * so it must stay free of browser and SvelteKit imports.
 */

export const DEV_VERSION = 'Dev';

export interface VersionInputs {
	/** Vercel's `VERCEL_ENV`: `production`, `preview`, or `development`. */
	vercelEnv?: string;
	/** Vercel's `VERCEL_GIT_COMMIT_MESSAGE` for the deployed commit. */
	commitMessage?: string;
	/** Vercel's `VERCEL_GIT_COMMIT_SHA` for the deployed commit. */
	commitSha?: string;
	buildDate: Date;
}

/**
 * Pull request number from a squash merge (`title (#66)`) or merge commit
 * (`Merge pull request #66 from ...`) subject line, or null for a direct push.
 */
export function pullRequestNumber(commitMessage: string | undefined): number | null {
	const subject = commitMessage?.split('\n', 1)[0] ?? '';
	const match = /\(#(\d+)\)\s*$/.exec(subject) ?? /^Merge pull request #(\d+)\b/.exec(subject);
	return match ? Number(match[1]) : null;
}

export function resolveAppVersion({ vercelEnv, commitMessage, commitSha, buildDate }: VersionInputs): string {
	if (vercelEnv !== 'production') return DEV_VERSION;

	const date = [
		buildDate.getUTCFullYear(),
		String(buildDate.getUTCMonth() + 1).padStart(2, '0'),
		String(buildDate.getUTCDate()).padStart(2, '0'),
	].join('.');

	const pr = pullRequestNumber(commitMessage);
	if (pr !== null) return `${date}.${pr}`;
	// A production build without a PR (direct push or manual redeploy) still gets a traceable label.
	const sha = commitSha?.slice(0, 7);
	return sha ? `${date}+${sha}` : date;
}
