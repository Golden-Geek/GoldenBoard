import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
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
