import { writable } from 'svelte/store';

/**
 * A wrapper around a svelte store that also saves the store value to the SessionStorage of the browser.
 * The stored value should be an object that can be converted to a valid JSON string.
 *
 * e.g. -> JSON.parse(JSON.stringigy(value)) should not throw an error.
 *
 * You should not set a persistent store to an undefined value, however you can use any of the minimal JSON strings below:
 *
 *  The empty object '{}'
 *  The empty array '[]'
 *  The string that is empty '""'
 *  A number e.g. '123.4'
 *  The boolean value true 'true'
 *  The boolean value false 'false'
 *  The null value 'null'
 */
export class PersistentStore {
  _underlyingStore;

  constructor(sessionStorageKey, defaultValue) {
    let sessionStorageValue = sessionStorage.getItem(sessionStorageKey);
    if (!sessionStorageValue || sessionStorageValue == 'undefined') {
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(defaultValue));
    }
    const storedValue = JSON.parse(sessionStorage.getItem(sessionStorageKey));
    this._underlyingStore = writable(storedValue);

    // This object should have the whole app's lifetime, so no need to keep an reference the the unsubscribe method.
    // If you use store subscription in components that will appear and disapear over time, do not forget to keep a reference to the unsubscribe function.
    this._underlyingStore.subscribe((value) => {
      if (value === undefined) debugger; // legal to set null but not undefined
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(value));
    });
  }

  getStore() {
    return this._underlyingStore;
  }
}
