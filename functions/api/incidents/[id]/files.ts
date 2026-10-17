/**
 * POST /api/incidents/:id/files (session) → IncidentFile (201)
 *
 * The raw file is the request body (not JSON): `Content-Type` is the file type, `X-File-Name` the
 * URL-encoded name, `Content-Length` is required. One file per request.
 */
import {
  ALLOWED_TYPES,
  INCIDENT_LIMITS,
  isAllowedType,
  type IncidentFile,
  type IncidentLimits,
} from '../../../../src/shared/api-schemas';
import { nowISO } from '../../../../src/shared/dates';
import {
  HttpError,
  badRequest,
  countIncidentFiles,
  getIncident,
  insertIncidentFile,
  json,
  notFound,
  readIdParam,
  requireUser,
  route,
  toIncidentFile,
  type AppContext,
} from '../../../../server/lib';

/** Media type without parameters, trimmed and lower-cased. */
function mediaType(header: string | null): string {
  return (header ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
}

/** Decodes and sanitizes `X-File-Name`: no control characters, quotes or slashes. */
function readFileName(header: string | null, max: number): string {
  let decoded = header ?? '';
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    throw badRequest('X-File-Name: bad encoding');
  }
  const clean = decoded
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f"\\/]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
  return clean === '' ? 'file' : clean;
}

export function createUploadHandler(limits: IncidentLimits = INCIDENT_LIMITS) {
  return route<'id'>(async (ctx: AppContext<'id'>) => {
    const user = requireUser(ctx);
    const { env, request } = ctx;
    const incidentId = readIdParam(ctx.params);

    const incident = await getIncident(env.DB, incidentId);
    if (!incident || incident.deleted_at) throw notFound('Incident not found');

    const type = mediaType(request.headers.get('content-type'));
    if (!isAllowedType(type)) throw new HttpError(415, 'File type not allowed');
    const fileName = readFileName(request.headers.get('x-file-name'), limits.fileName);

    const lengthHeader = request.headers.get('content-length');
    if (lengthHeader === null || !/^\d+$/.test(lengthHeader)) {
      throw new HttpError(411, 'Content-Length required');
    }
    const cap = limits[ALLOWED_TYPES[type]];
    if (Number(lengthHeader) > cap) throw new HttpError(413, 'File too large');

    if ((await countIncidentFiles(env.DB, incidentId)) >= limits.maxFiles) {
      throw new HttpError(413, `Max ${limits.maxFiles} files per incident`);
    }

    // Buffered on purpose: R2 put needs a known length, and a lying Content-Length is caught here.
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > cap) throw new HttpError(413, 'File too large');
    if (bytes.byteLength === 0) throw badRequest('Empty file');

    const fileId = crypto.randomUUID();
    const r2Key = `incidents/${incidentId}/${fileId}`;
    await env.INCIDENT_FILES.put(r2Key, bytes, { httpMetadata: { contentType: type } });
    const row = {
      id: fileId,
      incident_id: incidentId,
      r2_key: r2Key,
      file_name: fileName,
      content_type: type,
      size: bytes.byteLength,
      uploaded_by: user,
      created_at: nowISO(),
    };
    try {
      await insertIncidentFile(env.DB, row);
    } catch (err) {
      await env.INCIDENT_FILES.delete(r2Key);
      throw err;
    }
    const body: IncidentFile = toIncidentFile(row);
    return json(body, 201);
  });
}

export const onRequestPost = createUploadHandler();
