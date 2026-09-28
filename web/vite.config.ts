/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { resolveAppVersion } from './src/lib/app-version';

// Vercel exposes these system variables at build time; locally they are unset, so the label is `Dev`.
const appVersion = resolveAppVersion({
	vercelEnv: process.env.VERCEL_ENV,
	commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE,
	commitSha: process.env.VERCEL_GIT_COMMIT_SHA,
	buildDate: new Date(),
});

export default defineConfig({
	// Node supports native top-level await. Rewriting server chunks delays SvelteKit's
	// options initialization until after the Vercel function constructs its Server.
	plugins: [
		wasm(),
		{ ...topLevelAwait(), applyToEnvironment: (environment) => environment.name === 'client' },
		sveltekit(),
	],
	define: {
		__APP_VERSION__: JSON.stringify(appVersion),
	},
	optimizeDeps: {
		exclude: ['@myriaddreamin/typst.ts'],
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
});
