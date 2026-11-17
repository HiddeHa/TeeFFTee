/**
 * Raw `db.execute` returns a row array on postgres.js and a `{ rows }` wrapper on
 * the Neon HTTP driver. Every raw query on the site goes through this so the
 * caller does not have to know which transport is live.
 */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}
