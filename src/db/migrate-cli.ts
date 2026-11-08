import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";
import { logger } from "../config/logger";
import { runMigrations } from "./migrate";

dotenv.config();

const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  const client = new Client({
    connectionString,
    ssl: (process.env.DATABASE_SSL ?? "false").toLowerCase() === "true" ? { rejectUnauthorized: true } : undefined
  });

  await client.connect();
  try {
    const applied = await runMigrations(
      { query: async (text, params) => ({ rows: (await client.query(text, params as unknown[] | undefined)).rows }) },
      MIGRATIONS_DIR
    );
    logger.info({ applied }, applied.length > 0 ? "Migrations applied" : "Database already up to date");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  logger.error({ err: error }, "Migration failed");
  process.exit(1);
});
