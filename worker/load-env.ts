/**
 * Load `.env` for the worker.
 *
 * Must be imported before anything that reads `process.env` at module scope —
 * `config.ts` reads the API key, key type and every crawl knob when it is first
 * imported, so a later load would be too late and the key would silently read as
 * empty.
 *
 * Node's `--env-file` flag would do the same job, but it is not available to
 * every way this file gets run, and it errors when the file is missing.
 * `process.loadEnvFile` needs no flag, no dependency, and cannot clobber real
 * environment variables: like `--env-file`, variables already set win, so Docker
 * and CI keep passing config the usual way and a stray `.env` in the build
 * context cannot override them.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
