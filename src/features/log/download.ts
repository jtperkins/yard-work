/**
 * Saves text as a file in the browser. CSV gets a UTF-8 byte-order mark so Excel opens accents
 * (José, Ñ) correctly.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv;charset=utf-8',
): void {
  const bom = mimeType.startsWith('text/csv') ? '﻿' : '';
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
