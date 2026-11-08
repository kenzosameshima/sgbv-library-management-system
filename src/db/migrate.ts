import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface SqlExecutor {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

/** Arbitrary constant: serialises concurrent migration runs (several app instances starting together). */
const MIGRATION_LOCK_ID = 727274;

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

/**
 * Applies the `.sql` files in `dir` that have not run yet, in name order, each in its own transaction.
 * Returns the names applied. Throws if an already-applied file was edited, since that means the
 * database no longer matches the repository.
 */
export async function runMigrations(executor: SqlExecutor, dir: string): Promise<string[]> {
  await executor.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);

  try {
    await executor.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name TEXT PRIMARY KEY,
         checksum TEXT NOT NULL,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );

    const { rows } = await executor.query("SELECT name, checksum FROM schema_migrations");
    const appliedChecksums = new Map(rows.map((row) => [String(row.name), String(row.checksum)]));

    const files = readdirSync(dir)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    const pending: Array<{ name: string; sql: string }> = [];
    for (const name of files) {
      const sql = readFileSync(path.join(dir, name), "utf8");
      const previous = appliedChecksums.get(name);

      if (previous === undefined) {
        pending.push({ name, sql });
      } else if (previous !== checksum(sql)) {
        throw new Error(`Migration ${name} changed after it was applied; add a new migration instead`);
      }
    }

    for (const { name, sql } of pending) {
      await executor.query("BEGIN");
      try {
        await executor.query(sql);
        await executor.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [name, checksum(sql)]);
        await executor.query("COMMIT");
      } catch (error) {
        await executor.query("ROLLBACK");
        throw error;
      }
    }

    return pending.map((migration) => migration.name);
  } finally {
    await executor.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
  }
}
