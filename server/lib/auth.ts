/** Which requests need a session (plan §4 + §14.3). Pure, so it is unit-testable. */

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Writes that work signed out: signing in and signing out. */
const PUBLIC_WRITE_PATHS = new Set(['/api/login', '/api/logout']);

/** Handoff notes may hold gate codes and phone numbers: sign-in required to read too. */
function isPrivatePath(pathname: string): boolean {
  return pathname === '/api/notes' || pathname.startsWith('/api/notes/');
}

function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function requiresSession(method: string, pathname: string): boolean {
  const path = normalize(pathname);
  if (isPrivatePath(path)) return true;
  if (READ_METHODS.has(method.toUpperCase())) return false;
  return !PUBLIC_WRITE_PATHS.has(path);
}
