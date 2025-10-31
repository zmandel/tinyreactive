import '../../src/store.js';

const api = globalThis.StoreLib;

if (!api || typeof api.createStore !== 'function') {
  throw new Error('TinyReactive store failed to load.');
}

export const { createStore } = api;
export default api;
