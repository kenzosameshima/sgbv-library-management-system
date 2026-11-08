import { query } from "../config/db";
import { Fine } from "../models/types";

// pg returns NUMERIC as a string; cast so `amount` matches the Fine type.
const FINE_COLUMNS = "id, user_id, loan_id, amount::float8 AS amount, paid, created_at, paid_at";

export async function listFinesByUser(userId: string): Promise<Fine[]> {
  return query<Fine>(`SELECT ${FINE_COLUMNS} FROM fines WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
}

export async function payFine(fineId: string): Promise<Fine | null> {
  const rows = await query<Fine>(
    `UPDATE fines
     SET paid = TRUE, paid_at = NOW()
     WHERE id = $1 AND paid = FALSE
     RETURNING ${FINE_COLUMNS}`,
    [fineId]
  );

  return rows[0] ?? null;
}
