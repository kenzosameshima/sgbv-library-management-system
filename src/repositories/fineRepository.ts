import { query } from "../config/db";
import { Fine } from "../models/types";

export async function hasPendingFines(userId: string): Promise<boolean> {
  const rows = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM fines WHERE user_id = $1 AND paid = FALSE",
    [userId]
  );

  return Number(rows[0]?.count ?? 0) > 0;
}

export async function createFine(data: { userId: string; loanId: string; amount: number }): Promise<Fine> {
  const rows = await query<Fine>(
    `INSERT INTO fines (user_id, loan_id, amount, paid)
     VALUES ($1, $2, $3, FALSE)
     RETURNING *`,
    [data.userId, data.loanId, data.amount]
  );

  return rows[0];
}

export async function listFinesByUser(userId: string): Promise<Fine[]> {
  return query<Fine>("SELECT * FROM fines WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
}

export async function payFine(fineId: string): Promise<Fine | null> {
  const rows = await query<Fine>(
    `UPDATE fines
     SET paid = TRUE, paid_at = NOW()
     WHERE id = $1 AND paid = FALSE
     RETURNING *`,
    [fineId]
  );

  return rows[0] ?? null;
}
