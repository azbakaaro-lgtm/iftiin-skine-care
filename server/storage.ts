// Local disk storage helpers.
// Uploads are written under ENV.storageDir and served back from
// ENV.storagePublicPath (see server/_core/storageProxy.ts).
//
// Swap this file for an S3/GCS-backed implementation later if you need
// multi-instance or CDN-backed storage — storagePut/storageGet/
// storageGetSignedUrl is the whole surface the rest of the app depends on.

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { ENV } from "./_core/env";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function resolveStoragePath(key: string): string {
  const base = path.resolve(process.cwd(), ENV.storageDir);
  const resolved = path.resolve(base, key);
  // Guard against path traversal via a crafted key.
  if (!resolved.startsWith(base)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = resolveStoragePath(key);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, typeof data === "string" ? Buffer.from(data) : Buffer.from(data));

  return { key, url: `${ENV.storagePublicPath}/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `${ENV.storagePublicPath}/${key}` };
}

// Local storage has no presigned-URL concept — the public path already
// serves the file directly, so this just returns that URL.
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `${ENV.storagePublicPath}/${key}`;
}
