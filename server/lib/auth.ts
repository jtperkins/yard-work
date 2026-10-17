/** Which requests need a session. Pure, so it is unit-testable. */

/**
 * The whole site is private: every API request needs a session except signing in,
 * signing out and asking "who am I" (which answers {name: null} when signed out).
 */
const PUBLIC_PATHS = new Set(['/api/login', '/api/logout', '/api/me']);

function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function requiresSession(_method: string, pathname: string): boolean {
  return !PUBLIC_PATHS.has(normalize(pathname));
}
