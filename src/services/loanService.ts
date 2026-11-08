import { HttpError } from "../utils/httpError";
import { FINE_PER_DAY, LOAN_DAYS, MAX_ACTIVE_LOANS, RESERVATION_EXPIRATION_HOURS } from "../utils/constants";
import { PoolClientLike, withTransaction } from "../config/db";
import { Loan } from "../models/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const BOOK_UNAVAILABLE = "Livro indisponivel. Considere criar uma reserva";

export interface ReturnResult {
  loan: Loan;
  fineAmount: number;
}

/**
 * All checks run inside the transaction, after locking the user and book rows,
 * so concurrent requests for the same user or book are serialised.
 */
export async function createLoanForUser(userId: string, bookId: string): Promise<Loan> {
  const dueDate = new Date(Date.now() + LOAN_DAYS * DAY_MS);

  return withTransaction(async (client) => {
    const user = await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (user.rows.length === 0) {
      throw new HttpError(404, "Usuario nao encontrado");
    }

    const pendingFines = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM fines WHERE user_id = $1 AND paid = FALSE",
      [userId]
    );
    if (Number(pendingFines.rows[0].count) > 0) {
      throw new HttpError(400, "Usuario possui multas pendentes");
    }

    const activeLoans = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM loans WHERE user_id = $1 AND status = 'ACTIVE'",
      [userId]
    );
    if (Number(activeLoans.rows[0].count) >= MAX_ACTIVE_LOANS) {
      throw new HttpError(400, "Limite maximo de emprestimos ativos atingido");
    }

    const book = await client.query<{ available_copies: number }>(
      "SELECT available_copies FROM books WHERE id = $1 FOR UPDATE",
      [bookId]
    );
    if (book.rows.length === 0) {
      throw new HttpError(404, "Livro nao encontrado");
    }

    // Copies offered to other users' reservations are not up for grabs.
    const heldForOthers = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM reservations
       WHERE book_id = $1
         AND user_id <> $2
         AND status = 'AVAILABLE'
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [bookId, userId]
    );
    if (book.rows[0].available_copies - Number(heldForOthers.rows[0].count) <= 0) {
      throw new HttpError(400, BOOK_UNAVAILABLE);
    }

    await client.query("UPDATE books SET available_copies = available_copies - 1 WHERE id = $1", [bookId]);

    await client.query(
      `UPDATE reservations
       SET status = 'FULFILLED'
       WHERE user_id = $1 AND book_id = $2 AND status = 'AVAILABLE'`,
      [userId, bookId]
    );

    const createdLoan = await client.query<Loan>(
      `INSERT INTO loans (user_id, book_id, due_date, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       RETURNING *`,
      [userId, bookId, dueDate]
    );

    return createdLoan.rows[0];
  });
}

export async function returnLoanForUser(userId: string, bookId: string): Promise<ReturnResult> {
  return withTransaction(async (client) => {
    const found = await client.query<Loan>(
      `SELECT * FROM loans
       WHERE user_id = $1 AND book_id = $2 AND status = 'ACTIVE'
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [userId, bookId]
    );

    if (found.rows.length === 0) {
      throw new HttpError(404, "Emprestimo ativo nao encontrado para este usuario e livro");
    }

    return finalizeLoan(client, found.rows[0]);
  });
}

export async function returnLoanByIdForUser(userId: string, loanId: string): Promise<ReturnResult> {
  return withTransaction(async (client) => {
    const found = await client.query<Loan>(
      "SELECT * FROM loans WHERE id = $1 AND status = 'ACTIVE' FOR UPDATE",
      [loanId]
    );

    if (found.rows.length === 0) {
      throw new HttpError(404, "Emprestimo ativo nao encontrado");
    }

    if (found.rows[0].user_id !== userId) {
      throw new HttpError(403, "Sem permissao para devolver este emprestimo");
    }

    return finalizeLoan(client, found.rows[0]);
  });
}

/** Shared return path: close the loan, free the copy, charge any fine, advance the queue. */
async function finalizeLoan(client: PoolClientLike, loan: Loan): Promise<ReturnResult> {
  const finalizedLoan = await client.query<Loan>(
    `UPDATE loans
     SET status = 'RETURNED', return_date = NOW()
     WHERE id = $1 AND status = 'ACTIVE'
     RETURNING *`,
    [loan.id]
  );

  if (finalizedLoan.rows.length === 0) {
    throw new HttpError(409, "Emprestimo ja foi devolvido");
  }

  const finalized = finalizedLoan.rows[0];

  await client.query(
    `UPDATE books
     SET available_copies = LEAST(total_copies, available_copies + 1)
     WHERE id = $1`,
    [finalized.book_id]
  );

  const fineAmount = await applyFineIfOverdue(client, finalized);
  await processReservationQueue(client, finalized.book_id);

  return { loan: finalized, fineAmount };
}

async function applyFineIfOverdue(client: PoolClientLike, loan: Loan): Promise<number> {
  const overdueMs = Date.now() - new Date(loan.due_date).getTime();
  if (overdueMs <= 0) {
    return 0;
  }

  const fineAmount = Math.ceil(overdueMs / DAY_MS) * FINE_PER_DAY;

  await client.query(
    `INSERT INTO fines (user_id, loan_id, amount, paid)
     VALUES ($1, $2, $3, FALSE)`,
    [loan.user_id, loan.id, fineAmount]
  );

  return fineAmount;
}

async function processReservationQueue(client: PoolClientLike, bookId: string): Promise<void> {
  await client.query(
    `UPDATE reservations
     SET status = 'EXPIRED'
     WHERE book_id = $1
       AND status = 'AVAILABLE'
       AND expires_at IS NOT NULL
       AND expires_at < NOW()`,
    [bookId]
  );

  const next = await client.query<{ id: string }>(
    `SELECT id FROM reservations
     WHERE book_id = $1 AND status = 'QUEUED'
     ORDER BY created_at ASC
     LIMIT 1
     FOR UPDATE`,
    [bookId]
  );

  if (next.rows.length === 0) {
    return;
  }

  const expiresAt = new Date(Date.now() + RESERVATION_EXPIRATION_HOURS * HOUR_MS);
  await client.query("UPDATE reservations SET status = 'AVAILABLE', expires_at = $2 WHERE id = $1", [
    next.rows[0].id,
    expiresAt
  ]);
}
