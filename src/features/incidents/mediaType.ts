import { ALLOWED_TYPES, INCIDENT_LIMITS, isAllowedType } from '../../shared/api-schemas';

/** Media type by lower-case file extension, for files the browser reports with an empty type. */
const BY_EXTENSION: Record<string, string> = {
  heic: 'image/heic',
  heif: 'image/heif',
  mov: 'video/quicktime',
  mp4: 'video/mp4',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

/**
 * The media type to check and to upload with. Phones often leave `File.type` empty for HEIC/HEIF
 * and sometimes for `.mov`, so an empty type falls back to the file extension. Returns '' when
 * nothing is known. Parameters (`; charset=…`) are stripped and the result is lower-cased.
 */
export function fileMediaType(file: Pick<File, 'name' | 'type'>): string {
  const declared = file.type.split(';')[0]?.trim().toLowerCase() ?? '';
  if (declared) return declared;
  const dot = file.name.lastIndexOf('.');
  if (dot === -1) return '';
  return BY_EXTENSION[file.name.slice(dot + 1).toLowerCase()] ?? '';
}

export type FileProblem = { kind: 'type' } | { kind: 'size'; maxBytes: number };

/** What is wrong with a picked file, or null when it can be uploaded. */
export function fileProblem(file: Pick<File, 'name' | 'type' | 'size'>): FileProblem | null {
  const type = fileMediaType(file);
  if (!isAllowedType(type)) return { kind: 'type' };
  const maxBytes = INCIDENT_LIMITS[ALLOWED_TYPES[type]];
  return file.size > maxBytes ? { kind: 'size', maxBytes } : null;
}

/** Browsers cannot draw these, so they get a file icon instead of a thumbnail. */
export function canPreview(type: string): boolean {
  return type.startsWith('image/') && type !== 'image/heic' && type !== 'image/heif';
}

/** "1.2 MB", "340 KB", "12 B". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
