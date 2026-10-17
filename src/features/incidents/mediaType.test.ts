import { describe, expect, it } from 'vitest';
import { canPreview, fileMediaType, fileProblem, formatBytes } from './mediaType';

/** A File that claims `size` bytes without allocating them. */
const file = (name: string, type: string, size = 10) =>
  Object.defineProperty(new File([new Uint8Array(1)], name, { type }), 'size', { value: size });

describe('fileMediaType', () => {
  it('infers HEIC, MOV and friends from the extension when the type is empty', () => {
    expect(fileMediaType(new File([new Uint8Array(10)], 'x.heic', { type: '' }))).toBe(
      'image/heic',
    );
    expect(fileMediaType(new File([], 'clip.MOV', { type: '' }))).toBe('video/quicktime');
    expect(fileMediaType(new File([], 'a.heif', { type: '' }))).toBe('image/heif');
    expect(fileMediaType(new File([], 'a.JPG', { type: '' }))).toBe('image/jpeg');
    expect(fileMediaType(new File([], 'a.mp4', { type: '' }))).toBe('video/mp4');
    expect(fileMediaType(new File([], 'a.pdf', { type: '' }))).toBe('application/pdf');
  });

  it('uses the declared type, lower-cased, without parameters', () => {
    expect(fileMediaType(new File([], 'a.png', { type: 'image/png' }))).toBe('image/png');
    expect(fileMediaType(new File([], 'a.png', { type: 'Image/PNG; charset=x' }))).toBe(
      'image/png',
    );
    expect(fileMediaType(new File([], 'a.bin', { type: 'text/html' }))).toBe('text/html');
  });

  it('is empty when nothing is known', () => {
    expect(fileMediaType(new File([], 'notes.txt', { type: '' }))).toBe('');
    expect(fileMediaType(new File([], 'noextension', { type: '' }))).toBe('');
  });
});

describe('fileProblem', () => {
  it('accepts allowed types within their cap', () => {
    expect(fileProblem(file('a.png', 'image/png', 1000))).toBeNull();
    expect(fileProblem(file('a.heic', '', 1000))).toBeNull();
  });

  it('rejects a type that is not allowed, including an unknown empty one', () => {
    expect(fileProblem(file('a.svg', 'image/svg+xml'))).toEqual({ kind: 'type' });
    expect(fileProblem(file('notes.txt', ''))).toEqual({ kind: 'type' });
  });

  it('rejects files over the cap of their type', () => {
    const mb = 1024 * 1024;
    expect(fileProblem(file('a.png', 'image/png', 11 * mb))).toEqual({
      kind: 'size',
      maxBytes: 10 * mb,
    });
    expect(fileProblem(file('a.mp4', 'video/mp4', 49 * mb))).toBeNull();
    expect(fileProblem(file('a.mp4', 'video/mp4', 60 * mb))).toEqual({
      kind: 'size',
      maxBytes: 50 * mb,
    });
  });
});

describe('helpers', () => {
  it('previews only what a browser can draw', () => {
    expect(canPreview('image/png')).toBe(true);
    expect(canPreview('image/heic')).toBe(false);
    expect(canPreview('video/mp4')).toBe(false);
  });

  it('formats sizes', () => {
    expect(formatBytes(12)).toBe('12 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1536 * 1024)).toBe('1.5 MB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB');
  });
});
