import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
            // default options are shown. On some platforms
            // these options are set automatically — see below
			prerender: { default: true },
            pages: 'build',
            assets: 'build',
            fallback: "index.html",
			trailingSlash: 'always',
			ssr: false,
            precompress: false,
            strict: false
        })
	}
};

export default config;