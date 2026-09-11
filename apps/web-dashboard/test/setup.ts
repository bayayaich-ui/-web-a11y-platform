import '@testing-library/jest-dom';

// Provide a minimal fetch polyfill for tests if not present
if (typeof globalThis.fetch === 'undefined') {
  // vitest/jsdom provides fetch in recent versions; fallback no-op
  // @ts-ignore
  globalThis.fetch = () => Promise.resolve({ ok: false });
}
