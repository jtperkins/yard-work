/**
 * GET /api/incidents/files/:fileId (session) → the file bytes from the private R2 bucket.
 * Hardened: stored media type, nosniff, a sandboxing CSP, no caching and a safe Content-Disposition.
 */
import { getIncident, getIncidentFile, notFound, readIdParam, route } from '../../../../server/lib';

/** Types a browser can display. Anything else (HEIC) is offered as a download. */
const INLINE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
]);

/** RFC 5987 `filename*` value. */
function encodeRfc5987(name: string): string {
  return encodeURIComponent(name).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function contentDisposition(contentType: string, name: string): string {
  const disposition = INLINE_TYPES.has(contentType) ? 'inline' : 'attachment';
  const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeRfc5987(name)}`;
}

export const onRequestGet = route<'fileId'>(async ({ params, env }) => {
  const row = await getIncidentFile(env.DB, readIdParam(params, 'fileId'));
  if (!row) throw notFound();
  const incident = await getIncident(env.DB, row.incident_id);
  if (!incident || incident.deleted_at) throw notFound();
  const object = await env.INCIDENT_FILES.get(row.r2_key);
  if (!object) throw notFound();
  return new Response(object.body, {
    status: 200,
    headers: {
      'content-type': row.content_type,
      'content-length': String(row.size),
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      'content-disposition': contentDisposition(row.content_type, row.file_name),
      'cache-control': 'private, no-store',
    },
  });
});
