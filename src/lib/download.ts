/**
 * Browser file download helpers.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadText(
  content: string | Uint8Array,
  filename: string,
  mime = 'text/plain;charset=utf-8',
): void {
  const part: BlobPart = typeof content === 'string' ? content : new Uint8Array(content);
  downloadBlob(new Blob([part], { type: mime }), filename);
}
