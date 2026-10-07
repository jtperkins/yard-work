/**
 * Signed session cookie (plan §14.4) and house-code check.
 *
 * Cookie `yw_session` = base64url(JSON {name, exp}) + "." + base64url(HMAC-SHA256(payload)).
 * `exp` is seconds since the epoch. WebCrypto only (works in Workers and Node 22).
 * Comparisons use a manual constant-time XOR loop (no `timingSafeEqual` in Workers).
 */
import { z } from 'zod';
import { SESSION_COOKIE, personNameSchema } from '../../src/shared/api-schemas';
import { getCookie, isHttps, serializeCookie } from './http';

/** 90 days. */
export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/** Delay before answering a wrong house code (bot / drive-by deterrent). */
export const LOGIN_FAILURE_DELAY_MS = 500;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ---------------------------------------------------------------------------
// base64url (Unicode-safe: operates on UTF-8 bytes)
// ---------------------------------------------------------------------------

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Returns `null` for anything that is not valid base64url. */
export function base64urlDecode(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Constant-time helpers
// ---------------------------------------------------------------------------

/** Constant-time (for equal lengths) byte comparison via XOR accumulation. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
}

/** Compares the typed house code to the secret without leaking length or prefix timing. */
export async function houseCodeMatches(input: string, expected: string): Promise<boolean> {
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  return constantTimeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Sign / verify
// ---------------------------------------------------------------------------

const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    keyCache.set(secret, key);
  }
  return key;
}

async function hmac(secret: string, payload: string): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload));
  return new Uint8Array(sig);
}

const sessionPayloadSchema = z.object({
  name: personNameSchema,
  exp: z.number().int().positive(),
});
export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

/** Creates a signed session token for `name`, valid for 90 days from `now`. */
export async function signSession(
  name: string,
  secret: string,
  now: Date = new Date(),
): Promise<string> {
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const payload: SessionPayload = {
    name,
    exp: Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  return `${encoded}.${base64urlEncode(await hmac(secret, encoded))}`;
}

/** Returns the session name, or `null` when the token is missing, malformed, tampered or expired. */
export async function verifySession(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<string | null> {
  if (!token || !secret || token.length > 1024) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null;
  const encoded = token.slice(0, dot);
  const sig = base64urlDecode(token.slice(dot + 1));
  if (!sig) return null;
  if (!constantTimeEqual(sig, await hmac(secret, encoded))) return null;

  const raw = base64urlDecode(encoded);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(raw));
  } catch {
    return null;
  }
  const result = sessionPayloadSchema.safeParse(parsed);
  if (!result.success) return null;
  if (result.data.exp * 1000 <= now.getTime()) return null;
  return result.data.name;
}

/** Reads and verifies the session cookie on a request. */
export function sessionUser(request: Request, secret: string, now?: Date): Promise<string | null> {
  return verifySession(getCookie(request, SESSION_COOKIE), secret, now);
}

export function sessionCookie(token: string, request: Request): string {
  return serializeCookie(SESSION_COOKIE, token, {
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: isHttps(request),
  });
}

export function clearSessionCookie(request: Request): string {
  return serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure: isHttps(request) });
}
