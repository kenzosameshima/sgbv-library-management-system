import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations, type SqlExecutor } from "../../src/db/migrate";

const REAL_MIGRATIONS = path.resolve(__dirname, "../../migrations");

let db: PGlite;
let dir: string;

// PGlite has no extensions beyond the basics, so the real migrations are run with extensions stripped.
function executorFor(pg: PGlite): SqlExecutor {
  return {
    query: async (text, params) => {
      if (params) {
        return { rows: (await pg.query(text, params as unknown[])).rows as Array<Record<string, unknown>> };
      }
      const results = await pg.exec(text.replace(/CREATE EXTENSION[^;]*;/g, ""));
      return { rows: (results[results.length - 1]?.rows ?? []) as Array<Record<string, unknown>> };
    }
  };
}

function migration(name: string, sql: string) {
  writeFileSync(path.join(dir, name), sql);
}

async function tables(): Promise<string[]> {
  const { rows } = await db.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  return rows.map((r) => r.table_name);
}

beforeEach(() => {
  db = new PGlite();
  dir = mkdtempSync(path.join(tmpdir(), "migrations-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("runMigrations", () => {
  it("builds the full schema from the repository migrations", async () => {
    const applied = await runMigrations(executorFor(db), REAL_MIGRATIONS);

    expect(applied).toContain("001_initial_schema.sql");
    expect(await tables()).toEqual(expect.arrayContaining(["users", "books", "loans", "reservations", "fines", "refresh_tokens"]));
  });

  it("applies nothing on a second run", async () => {
    const executor = executorFor(db);
    await runMigrations(executor, REAL_MIGRATIONS);

    expect(await runMigrations(executor, REAL_MIGRATIONS)).toEqual([]);
  });

  it("applies only the migrations added since the last run, in name order", async () => {
    const executor = executorFor(db);
    migration("001_a.sql", "CREATE TABLE a (id INT);");
    await runMigrations(executor, dir);
    migration("003_c.sql", "CREATE TABLE c (id INT);");
    migration("002_b.sql", "CREATE TABLE b (id INT);");

    const applied = await runMigrations(executor, dir);

    expect(applied).toEqual(["002_b.sql", "003_c.sql"]);
  });

  it("rolls a failing migration back completely and does not record it", async () => {
    const executor = executorFor(db);
    migration("001_bad.sql", "CREATE TABLE half_done (id INT); SELECT * FROM does_not_exist;");

    await expect(runMigrations(executor, dir)).rejects.toThrow();

    expect(await tables()).not.toContain("half_done");
    migration("001_bad.sql", "CREATE TABLE fixed (id INT);");
    await expect(runMigrations(executor, dir)).resolves.toEqual(["001_bad.sql"]);
  });

  it("refuses to continue when an applied migration was edited", async () => {
    const executor = executorFor(db);
    migration("001_a.sql", "CREATE TABLE a (id INT);");
    await runMigrations(executor, dir);
    migration("001_a.sql", "CREATE TABLE a (id INT, extra TEXT);");

    await expect(runMigrations(executor, dir)).rejects.toThrow(/001_a\.sql.*changed/i);
  });
});
