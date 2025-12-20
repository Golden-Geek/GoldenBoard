import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        paths: {
            base: process.env.BASE_PATH ?? '',
            relative: true
        },

        adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: 'index.html',
            precompress: false,
            strict: false
        })
    }
};

if (!process.env.BASE_PATH && process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY) {
    config.kit.paths.base = `/${process.env.GITHUB_REPOSITORY.split('/').pop()}`;
}

export default config;
