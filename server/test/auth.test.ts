import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ApiError, Me } from '../../src/shared/api-schemas';
import { todayCR } from '../../src/shared/dates';
import { base64urlEncode, signSession } from '../lib';
import { type Harness, TEST_HOUSE_CODE, api, createHarness, resetDb, uuid } from './harness';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h?.dispose();
});
beforeEach(async () => {
  await resetDb(h.db);
});

function cookieValue(setCookie: string | null): string {
  const match = /yw_session=([^;]*)/.exec(setCookie ?? '');
  if (!match) throw new Error(`no yw_session in ${setCookie}`);
  return match[1] as string;
}

describe('POST /api/login', () => {
  it('signs in with the right code and sets an HttpOnly session cookie', async () => {
    const res = await api<Me>(h, '/api/login', {
      method: 'POST',
      body: { name: '  JT  ', code: TEST_HOUSE_CODE },
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'JT' });
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toMatch(/^yw_session=[\w-]+\.[\w-]+; /);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=7776000');
    expect(setCookie).not.toContain('Secure'); // plain-http dev

    const me = await api<Me>(h, '/api/me', { cookie: cookieValue(setCookie) });
    expect(me.body).toEqual({ name: 'JT' });
  });

  it('adds Secure over https', async () => {
    const res = await api(h, '/api/login', {
      method: 'POST',
      origin: 'https://yard-work.pages.dev',
      body: { name: 'JT', code: TEST_HOUSE_CODE },
    });
    expect(res.headers.get('set-cookie')).toContain('; Secure');
  });

  it('round-trips Unicode names through the cookie', async () => {
    for (const name of ['José', 'Ñandú Peña', 'Zoë 🐈']) {
      const res = await api<Me>(h, '/api/login', {
        method: 'POST',
        body: { name, code: TEST_HOUSE_CODE },
      });
      expect(res.body.name).toBe(name);
      const me = await api<Me>(h, '/api/me', {
        cookie: cookieValue(res.headers.get('set-cookie')),
      });
      expect(me.body.name).toBe(name);
    }
  });

  it('rejects a wrong code with 401 after a delay, without a cookie', async () => {
    const started = Date.now();
    const res = await api<ApiError>(h, '/api/login', {
      method: 'POST',
      body: { name: 'Bot', code: 'guess-1234' },
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/house code/i);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(Date.now() - started).toBeGreaterThanOrEqual(450);
  });

  it('validates the name and code', async () => {
    for (const body of [
      { name: '   ', code: TEST_HOUSE_CODE },
      { name: 'x'.repeat(41), code: TEST_HOUSE_CODE },
      { name: 'JT', code: '' },
      { name: 'JT' },
    ]) {
      const res = await api<ApiError>(h, '/api/login', { method: 'POST', body });
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    }
  });

  it('requires a JSON body', async () => {
    const res = await api(h, '/api/login', {
      method: 'POST',
      rawBody: `name=JT&code=${TEST_HOUSE_CODE}`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status).toBe(415);
    const malformed = await api(h, '/api/login', {
      method: 'POST',
      rawBody: '{"name":',
      headers: { 'content-type': 'application/json' },
    });
    expect(malformed.status).toBe(400);
  });

  it('answers 500 (not a free pass) when the server has no house code configured', async () => {
    const res = await api<ApiError>({ ...h, env: { ...h.env, HOUSE_CODE: '' } }, '/api/login', {
      method: 'POST',
      body: { name: 'JT', code: 'anything' },
    });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/logout and GET /api/me', () => {
  it('reports signed-out users as {name: null}', async () => {
    const res = await api<Me>(h, '/api/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: null });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('logout clears the cookie, signed in or not', async () => {
    for (const as of ['JT', undefined]) {
      const res = await api<Me>(h, '/api/logout', { method: 'POST', as });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ name: null });
      expect(res.headers.get('set-cookie')).toMatch(/^yw_session=; .*Max-Age=0/);
    }
  });
});

describe('session cookie handling', () => {
  it('treats tampered, foreign and expired cookies as signed out', async () => {
    const good = await signSession('JT', h.env.SESSION_SECRET);
    const [, sig] = good.split('.');
    const forgedPayload = base64urlEncode(
      new TextEncoder().encode(JSON.stringify({ name: 'Owner', exp: 9_999_999_999 })),
    );
    const foreign = await signSession('JT', 'not-the-server-secret');
    const expired = await signSession('JT', h.env.SESSION_SECRET, new Date('2020-01-01T00:00:00Z'));

    for (const cookie of [`${forgedPayload}.${sig}`, foreign, expired, 'garbage']) {
      expect((await api<Me>(h, '/api/me', { cookie })).body).toEqual({ name: null });
      const write = await api(h, '/api/notes', {
        method: 'POST',
        cookie,
        body: { id: uuid(), body: 'hi' },
      });
      expect(write.status).toBe(401);
    }
  });
});

describe('auth gating', () => {
  const someId = '6f1c1c7e-3c1a-4d0e-9a51-2b8a4f6f0c11';
  const writes: Array<[method: string, path: string]> = [
    ['POST', '/api/completions'],
    ['DELETE', `/api/completions/${someId}`],
    ['POST', '/api/tasks'],
    ['PATCH', '/api/tasks/some-task'],
    ['POST', '/api/incidents'],
    ['DELETE', `/api/incidents/${someId}`],
    ['POST', '/api/notes'],
    ['DELETE', `/api/notes/${someId}`],
  ];

  it.each(writes)('%s %s → 401 when signed out', async (method, path) => {
    const res = await api<ApiError>(h, path, { method, body: {} });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Sign in required' });
  });

  it('a signed-out write does not touch the database', async () => {
    await api(h, '/api/completions', {
      method: 'POST',
      body: { id: uuid(), taskId: 'chapia', doneOn: todayCR(), doneBy: 'JT' },
    });
    const row = await h.db.prepare('SELECT COUNT(*) AS n FROM completions').first<{ n: number }>();
    expect(row?.n).toBe(0);
  });

  it('GET /api/notes requires sign-in; public reads do not', async () => {
    expect((await api(h, '/api/notes')).status).toBe(401);
    expect((await api(h, '/api/completions')).status).toBe(200);
    expect((await api(h, '/api/completions/latest')).status).toBe(200);
    expect((await api(h, '/api/tasks')).status).toBe(200);
  });
});

describe('unknown routes', () => {
  it('returns 404 JSON for unknown /api paths and unsupported methods', async () => {
    const res = await api<ApiError>(h, '/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
    expect(res.headers.get('content-type')).toContain('application/json');
    // GET on a DELETE-only route falls through to the catch-all
    const wrongMethod = await api(h, '/api/completions/6f1c1c7e-3c1a-4d0e-9a51-2b8a4f6f0c11');
    expect(wrongMethod.status).toBe(404);
  });
});
