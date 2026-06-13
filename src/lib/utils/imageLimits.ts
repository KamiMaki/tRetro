// Keep MAX_IMAGE_CHARS in sync with the server-side cap in
// src/lib/socket/handlers/limits.ts. Do NOT change the server file here.

/** Maximum raw file size before base64 encoding. Base64 inflates ~1.37×,
 *  so 2 000 000 bytes → ~2 740 000 chars, safely under the 3 000 000-char
 *  server cap. */
export const MAX_IMAGE_BYTES = 2_000_000;

/** Maximum base64-encoded string length (post-encode backstop). Matches the
 *  server-side limit so a client-bypassed upload is still rejected by the
 *  socket handler. */
export const MAX_IMAGE_CHARS = 3_000_000;

/**
 * Returns a user-facing error message when the file exceeds the raw-byte
 * limit, or null when the file is within limits. Checks BEFORE encoding so
 * the FileReader is never invoked for oversized files.
 *
 * Example message: "圖片 4.2MB 超過上限 2MB"
 */
export function imageSizeError(file: File): string | null {
  if (file.size <= MAX_IMAGE_BYTES) return null;
  const actualMB = (file.size / 1_000_000).toFixed(1);
  const limitMB = (MAX_IMAGE_BYTES / 1_000_000).toFixed(0);
  return `圖片 ${actualMB}MB 超過上限 ${limitMB}MB`;
}
