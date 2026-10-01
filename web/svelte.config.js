import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		warningFilter: (warning) => {
			if (warning.code === 'a11y_invalid_attribute') return false;
			return true;
		},
	},
	kit: {
		adapter: adapter({
			// Pin the serverless runtime so builds don't depend on the local Node version.
			runtime: 'nodejs22.x',
		}),
	},
};

export default config;
