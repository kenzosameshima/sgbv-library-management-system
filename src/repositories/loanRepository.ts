import { query } from "../config/db";
import { Loan } from "../models/types";

export async function countActiveLoansByUser(userId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM loans WHERE user_id = $1 AND status = 'ACTIVE'",
    [userId]
  );

  return Number(rows[0]?.count ?? 0);
}

export async function createLoan(data: { userId: string; bookId: string; dueDate: Date }): Promise<Loan> {
  const rows = await query<Loan>(
    `INSERT INTO loans (user_id, book_id, due_date, status)
     VALUES ($1, $2, $3, 'ACTIVE')
     RETURNING *`,
    [data.userId, data.bookId, data.dueDate]
  );

  return rows[0];
}

export async function findActiveLoanByUserAndBook(userId: string, bookId: string): Promise<Loan | null> {
  const rows = await query<Loan>(
    "SELECT * FROM loans WHERE user_id = $1 AND book_id = $2 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1",
    [userId, bookId]
  );

  return rows[0] ?? null;
}

export async function findActiveLoanById(loanId: string): Promise<Loan | null> {
  const rows = await query<Loan>(
    "SELECT * FROM loans WHERE id = $1 AND status = 'ACTIVE' LIMIT 1",
    [loanId]
  );

  return rows[0] ?? null;
}

export async function finalizeLoan(loanId: string): Promise<Loan | null> {
  const rows = await query<Loan>(
    `UPDATE loans
     SET status = 'RETURNED', return_date = NOW()
     WHERE id = $1
     RETURNING *`,
    [loanId]
  );

  return rows[0] ?? null;
}

export async function listLoansByUser(userId: string): Promise<Loan[]> {
  return query<Loan>("SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
}
