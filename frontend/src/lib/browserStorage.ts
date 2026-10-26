/** The browser's storage of a kind, or null where even reading it throws: a browser that blocks site data. */
export function browserStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}
