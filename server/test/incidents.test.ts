import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUploadHandler } from '../../functions/api/incidents/[id]/files';
import {
  INCIDENT_LIMITS,
  type ApiError,
  type IncidentFile,
  type IncidentRes,
  type IncidentsRes,
} from '../../src/shared/api-schemas';
import { type Harness, api, createHarness, makeContext, resetDb, uuid } from './harness';

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

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);

function report(over: Record<string, unknown> = {}, as: string | undefined = 'JT') {
  return api<IncidentRes & ApiError>(h, '/api/incidents', {
    method: 'POST',
    as,
    body: {
      id: uuid(),
      occurredAt: new Date(Date.now() - 3600_000).toISOString(),
      type: 'sighting',
      description: 'Man looking over the fence',
      ...over,
    },
  });
}

function upload(
  incidentId: string,
  bytes: Uint8Array,
  headers: Record<string, string> = {},
  as: string | undefined = 'JT',
) {
  return api<IncidentFile & ApiError>(h, `/api/incidents/${incidentId}/files`, {
    method: 'POST',
    as,
    rawBody: bytes,
    headers: {
      'content-type': 'image/png',
      'content-length': String(bytes.byteLength),
      'x-file-name': 'photo.png',
      ...headers,
    },
  });
}

describe('auth', () => {
  it('needs a session for everything', async () => {
    const id = uuid();
    expect((await api(h, '/api/incidents')).status).toBe(401);
    expect((await api(h, '/api/incidents', { method: 'POST', body: { id } })).status).toBe(401);
    expect((await api(h, `/api/incidents/files/${id}`)).status).toBe(401);
    expect((await api(h, `/api/incidents/${id}`)).status).toBe(401);
  });
});

describe('POST /api/incidents', () => {
  it('creates, then answers 200 with the stored body on a repeat id', async () => {
    const id = uuid();
    const first = await report({ id, location: ' Back gate ', people: 'Two men' });
    expect(first.status).toBe(201);
    expect(first.body.incident).toMatchObject({
      id,
      type: 'sighting',
      location: 'Back gate',
      people: 'Two men',
      reportedBy: 'JT',
    });
    const again = await report({ id, description: 'different' });
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
  });

  it('rejects an occurredAt in the future', async () => {
    const res = await report({ occurredAt: new Date(Date.now() + 24 * 3600_000).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/future/);
  });

  it('lists newest first with file counts, and hides deleted ones', async () => {
    const older = await report({ occurredAt: new Date(Date.now() - 7200_000).toISOString() });
    const newer = await report({ occurredAt: new Date(Date.now() - 600_000).toISOString() });
    await upload(older.body.incident.id, PNG);
    const list = await api<IncidentsRes>(h, '/api/incidents', { as: 'JT' });
    expect(list.body.incidents.map((i) => [i.id, i.fileCount])).toEqual([
      [newer.body.incident.id, 0],
      [older.body.incident.id, 1],
    ]);
  });
});

describe('POST /api/incidents/:id/files', () => {
  it('rejects types that are not allowed', async () => {
    const { incident } = (await report()).body;
    expect((await upload(incident.id, PNG, { 'content-type': 'text/html' })).status).toBe(415);
    expect((await upload(incident.id, PNG, { 'content-type': 'image/svg+xml' })).status).toBe(415);
    expect((await upload(incident.id, PNG, { 'content-type': 'image/pngx' })).status).toBe(415);
  });

  it('normalizes the media type', async () => {
    const { incident } = (await report()).body;
    const res = await upload(incident.id, PNG, { 'content-type': 'Image/PNG; charset=binary' });
    expect(res.status).toBe(201);
    expect(res.body.contentType).toBe('image/png');
    expect(res.body.size).toBe(PNG.byteLength);
  });

  it('needs Content-Length', async () => {
    const { incident } = (await report()).body;
    const request = new Request(`http://localhost:8788/api/incidents/${incident.id}/files`, {
      method: 'POST',
      headers: { 'content-type': 'image/png', 'x-file-name': 'a.png' },
      body: new Blob([PNG]).stream(),
      // @ts-expect-error duplex is required for stream bodies in Node
      duplex: 'half',
    });
    request.headers.delete('content-length');
    const res = await createUploadHandler()(
      makeContext({ request, env: h.env, user: 'JT', params: { id: incident.id } }) as never,
    );
    expect(res.status).toBe(411);
  });

  it('enforces the size caps per type', async () => {
    const { incident } = (await report()).body;
    const handler = createUploadHandler({ ...INCIDENT_LIMITS, imageBytes: 1024, videoBytes: 4096 });
    const send = (type: string, size: number) => {
      const bytes = new Uint8Array(size).fill(7);
      const request = new Request(`http://localhost:8788/api/incidents/${incident.id}/files`, {
        method: 'POST',
        headers: {
          'content-type': type,
          'content-length': String(size),
          'x-file-name': 'a.bin',
        },
        body: bytes,
      });
      return handler(
        makeContext({ request, env: h.env, user: 'JT', params: { id: incident.id } }) as never,
      );
    };
    expect((await send('image/png', 2048)).status).toBe(413);
    expect((await send('video/mp4', 2048)).status).toBe(201);
  });

  it('answers 413 for the 11th file', async () => {
    const { incident } = (await report()).body;
    for (let i = 0; i < 10; i++) expect((await upload(incident.id, PNG)).status).toBe(201);
    const eleventh = await upload(incident.id, PNG);
    expect(eleventh.status).toBe(413);
    expect(eleventh.body.error).toBe('Max 10 files per incident');
  });

  it('rejects an empty file', async () => {
    const { incident } = (await report()).body;
    const res = await upload(incident.id, new Uint8Array(0));
    expect(res.status).toBe(400);
  });

  it('404s for a missing incident', async () => {
    expect((await upload(uuid(), PNG)).status).toBe(404);
  });
});

describe('GET /api/incidents/files/:fileId', () => {
  it('serves the same bytes with hardened headers', async () => {
    const { incident } = (await report()).body;
    const file = (await upload(incident.id, PNG)).body;
    const res = await api<ArrayBuffer>(h, `/api/incidents/files/${file.id}`, {
      as: 'JT',
      raw: true,
    });
    expect(res.status).toBe(200);
    expect([...new Uint8Array(res.body)]).toEqual([...PNG]);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('content-security-policy')).toContain('sandbox');
    expect(res.headers.get('content-disposition')).toMatch(/^inline;/);
  });

  it('keeps a hostile file name out of the headers', async () => {
    const { incident } = (await report()).body;
    const file = (
      await upload(incident.id, PNG, {
        'x-file-name': encodeURIComponent('evil"\r\nSet-Cookie: x.png'),
      })
    ).body;
    expect(file.fileName).not.toMatch(/["\r\n]/);
    const res = await api<ArrayBuffer>(h, `/api/incidents/files/${file.id}`, {
      as: 'JT',
      raw: true,
    });
    const disposition = res.headers.get('content-disposition') ?? '';
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition).toContain("filename*=UTF-8''");
    expect(disposition.match(/filename="([^"]*)"/)?.[1]).not.toContain('"');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('offers HEIC as a download', async () => {
    const { incident } = (await report()).body;
    const file = (await upload(incident.id, PNG, { 'content-type': 'image/heic' })).body;
    const res = await api<ArrayBuffer>(h, `/api/incidents/files/${file.id}`, {
      as: 'JT',
      raw: true,
    });
    expect(res.headers.get('content-disposition')).toMatch(/^attachment;/);
  });

  it('404s for a random id', async () => {
    expect((await api(h, `/api/incidents/files/${uuid()}`, { as: 'JT' })).status).toBe(404);
  });
});

describe('DELETE /api/incidents/:id', () => {
  it('soft deletes the incident and hides its files', async () => {
    const { incident } = (await report()).body;
    const file = (await upload(incident.id, PNG)).body;
    expect(
      (await api(h, `/api/incidents/${incident.id}`, { method: 'DELETE', as: 'JT' })).status,
    ).toBe(200);
    expect((await api<IncidentsRes>(h, '/api/incidents', { as: 'JT' })).body.incidents).toEqual([]);
    expect((await api(h, `/api/incidents/${incident.id}`, { as: 'JT' })).status).toBe(404);
    expect((await api(h, `/api/incidents/files/${file.id}`, { as: 'JT' })).status).toBe(404);
  });
});
