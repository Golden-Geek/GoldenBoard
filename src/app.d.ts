// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type pkg from '../package.json'; // Optional: import for better typing

declare global {
    const PKG: typeof pkg; 
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
