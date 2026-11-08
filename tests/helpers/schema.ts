import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

/** All migrations, in order, as one script. PGlite ships without pgcrypto, so extensions are stripped. */
export function loadSchema(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(MIGRATIONS_DIR, name), "utf8"))
    .join("\n")
    .replace(/CREATE EXTENSION[^;]*;/g, "");
}
