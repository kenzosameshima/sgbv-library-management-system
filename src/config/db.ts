import { Pool, QueryResultRow } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: true } : undefined
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: any[] = []
): Promise<T[]> {
  const { rows } = await pool.query<T>(text, params);
  return rows;
}

export async function withTransaction<T>(callback: (client: PoolClientLike) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

interface PoolClientLike {
  query: <T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]) => Promise<{ rows: T[] }>;
  release: () => void;
}
