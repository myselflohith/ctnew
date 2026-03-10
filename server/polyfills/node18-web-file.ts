/**
 * Node 18 has fetch(), but may not expose a global File constructor in some builds.
 * Some transitive deps (e.g. undici webidl) expect globalThis.File to exist.
 *
 * This polyfill is intentionally minimal: it only provides a constructor so imports don't crash.
 */
export function ensureFileGlobal() {
  if (!(globalThis as any).File) {
    (globalThis as any).File = class File {};
  }
}

ensureFileGlobal();
