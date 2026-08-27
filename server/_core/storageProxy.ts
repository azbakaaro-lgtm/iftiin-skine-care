import express, { type Express } from "express";
import path from "path";
import { ENV } from "./env";

// Serves files written by storagePut() (see server/storage.ts) directly
// from disk at ENV.storagePublicPath, e.g. GET /storage/<key>.
export function registerStorageProxy(app: Express) {
  const base = path.resolve(process.cwd(), ENV.storageDir);
  app.use(ENV.storagePublicPath, express.static(base, { fallthrough: true, maxAge: "1y" }));
}
