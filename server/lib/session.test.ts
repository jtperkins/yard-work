import { describe, expect, it } from 'vitest';
import { requiresSession } from './auth';
import { getCookie, serializeCookie } from './http';
import {
  SESSION_MAX_AGE_SECONDS,
  base64urlDecode,
  base64urlEncode,
  constantTimeEqual,
  houseCodeMatches,
  sessionCookie,
  signSession,
  verifySession,
} from './session';

const SECRET = 'unit-test-secret-abcdefghijklmnop';
const NOW = new Date('2026-10-07T12:00:00Z');

describe('base64url', () => {
  it('round-trips arbitrary bytes without padding or +/', () => {
    const bytes = new Uint8Array([0, 251, 255, 62, 63, 1, 2]);
    const text = base64urlEncode(bytes);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(base64urlDecode(text)).toEqual(bytes);
  });

  it('rejects invalid input', () => {
    expect(base64urlDecode('abc$')).toBeNull();
    expect(base64urlDecode('a')).toBeNull();
  });
});

describe('constantTimeEqual', () => {
  it('compares contents and length', () => {
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 0]))).toBe(false);
  });
});

describe('houseCodeMatches', () => {
  it('matches only the exact code', async () => {
    expect(await houseCodeMatches('casa-1234', 'casa-1234')).toBe(true);
    expect(await houseCodeMatches('casa-123', 'casa-1234')).toBe(false);
    expect(await houseCodeMatches(' casa-1234', 'casa-1234')).toBe(false);
  });

  it('never matches when the secret is unset', async () => {
    expect(await houseCodeMatches('', '')).toBe(false);
  });
});

describe('signSession / verifySession', () => {
  it('round-trips a name', async () => {
    const token = await signSession('JT', SECRET, NOW);
    expect(await verifySession(token, SECRET, NOW)).toBe('JT');
  });

  it.each(['José', 'Ñandú Peña', 'Zoë 🐈', '山田'])('round-trips Unicode name %s', async (name) => {
    const token = await signSession(name, SECRET, NOW);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(await verifySession(token, SECRET, NOW)).toBe(name);
  });

  it('expires after 90 days', async () => {
    const token = await signSession('JT', SECRET, NOW);
    const justBefore = new Date(NOW.getTime() + (SESSION_MAX_AGE_SECONDS - 1) * 1000);
    const atExpiry = new Date(NOW.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
    expect(await verifySession(token, SECRET, justBefore)).toBe('JT');
    expect(await verifySession(token, SECRET, atExpiry)).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signSession('JT', SECRET, NOW);
    const [, sig] = token.split('.');
    const forged = base64urlEncode(
      new TextEncoder().encode(JSON.stringify({ name: 'Owner', exp: 9_999_999_999 })),
    );
    expect(await verifySession(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const token = await signSession('JT', SECRET, NOW);
    const dot = token.indexOf('.');
    const flipped = token[dot + 1] === 'A' ? 'B' : 'A';
    const forged = `${token.slice(0, dot + 1)}${flipped}${token.slice(dot + 2)}`;
    expect(await verifySession(forged, SECRET, NOW)).toBeNull();
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signSession('JT', 'some-other-secret-value', NOW);
    expect(await verifySession(token, SECRET, NOW)).toBeNull();
  });

  it('rejects malformed tokens and missing secrets', async () => {
    const token = await signSession('JT', SECRET, NOW);
    for (const bad of [undefined, '', 'abc', 'a.b.c', '.sig', `${token}.x`, 'x'.repeat(2000)]) {
      expect(await verifySession(bad, SECRET, NOW)).toBeNull();
    }
    expect(await verifySession(token, '', NOW)).toBeNull();
    await expect(signSession('JT', '', NOW)).rejects.toThrow(/SESSION_SECRET/);
  });

  it('rejects a validly signed payload with an invalid shape', async () => {
    // Sign a payload by hand with a blank name: the signature checks out, the schema does not.
    const encoded = base64urlEncode(
      new TextEncoder().encode(JSON.stringify({ name: '   ', exp: 9_999_999_999 })),
    );
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded)),
    );
    expect(await verifySession(`${encoded}.${base64urlEncode(sig)}`, SECRET, NOW)).toBeNull();
  });
});

describe('cookies', () => {
  it('serializes the session cookie, Secure only over https', () => {
    const http = sessionCookie('tok', new Request('http://localhost/api/login'));
    expect(http).toBe(
      `yw_session=tok; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax; HttpOnly`,
    );
    const https = sessionCookie('tok', new Request('https://yard-work.pages.dev/api/login'));
    expect(https).toContain('; Secure');
  });

  it('reads one cookie among several', () => {
    const req = new Request('http://x/', { headers: { cookie: 'a=1; yw_session=abc.def; b=2' } });
    expect(getCookie(req, 'yw_session')).toBe('abc.def');
    expect(getCookie(req, 'missing')).toBeUndefined();
    expect(getCookie(new Request('http://x/'), 'a')).toBeUndefined();
  });

  it('clamps negative max-age', () => {
    expect(serializeCookie('a', '', { maxAge: -5, secure: false })).toContain('Max-Age=0');
  });
});

describe('requiresSession', () => {
  it('gates every read and write', () => {
    for (const path of ['/api/completions', '/api/completions/latest', '/api/tasks', '/api/tasks/x', '/api/notes', '/api/incidents', '/api/incidents/files/abc', '/api/nope']) {
      expect(requiresSession('GET', path)).toBe(true);
      expect(requiresSession('POST', path)).toBe(true);
    }
    expect(requiresSession('PATCH', '/api/tasks/x')).toBe(true);
    expect(requiresSession('DELETE', '/api/incidents/x')).toBe(true);
  });

  it('leaves login, logout and me open', () => {
    expect(requiresSession('POST', '/api/login')).toBe(false);
    expect(requiresSession('POST', '/api/logout/')).toBe(false);
    expect(requiresSession('GET', '/api/me')).toBe(false);
    expect(requiresSession('HEAD', '/api/me')).toBe(false);
  });
});
