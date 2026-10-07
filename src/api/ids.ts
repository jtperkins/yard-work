/**
 * Client-generated ids for idempotent POSTs (plan §14.3): the same id is used for the optimistic
 * cache entry and the request, so a retried POST returns the stored row instead of duplicating it.
 */

/**
 * A random v4 UUID. Uses `crypto.randomUUID()` when available; falls back to
 * `crypto.getRandomValues()` because `randomUUID` only exists in secure contexts (a phone testing
 * the dev server over plain http on the LAN has no `randomUUID`).
 */
export function newId(): string {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
