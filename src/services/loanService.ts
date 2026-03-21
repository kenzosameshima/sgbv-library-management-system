import { HttpError } from "../utils/httpError";
import { FINE_PER_DAY, LOAN_DAYS, MAX_ACTIVE_LOANS } from "../utils/constants";
import { findBookById } from "../repositories/bookRepository";
import { findUserById } from "../repositories/userRepository";
import { countActiveLoansByUser } from "../repositories/loanRepository";
import { createFine, hasPendingFines } from "../repositories/fineRepository";
import { withTransaction } from "../config/db";

export async function createLoanForUser(userId: string, bookId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "Usuario nao encontrado");
  }

  if (await hasPendingFines(userId)) {
    throw new HttpError(400, "Usuario possui multas pendentes");
  }

  const activeLoans = await countActiveLoansByUser(userId);
  if (activeLoans >= MAX_ACTIVE_LOANS) {
    throw new HttpError(400, "Limite maximo de emprestimos ativos atingido");
  }

  const book = await findBookById(bookId);
  if (!book) {
    throw new HttpError(404, "Livro nao encontrado");
  }

  if (book.available_copies <= 0) {
    throw new HttpError(400, "Livro indisponivel. Considere criar uma reserva");
  }

  const dueDate = new Date(Date.now() + LOAN_DAYS * 24 * 60 * 60 * 1000);

  return withTransaction(async (client) => {
    const bookUpdate = await client.query<{ id: string }>(
      `UPDATE books
       SET available_copies = available_copies - 1
       WHERE id = $1 AND available_copies > 0
       RETURNING id`,
      [bookId]
    );

    if (bookUpdate.rows.length === 0) {
      throw new HttpError(400, "Livro indisponivel. Considere criar uma reserva");
    }

    await client.query(
      `UPDATE reservations
       SET status = 'FULFILLED'
       WHERE user_id = $1 AND book_id = $2 AND status = 'AVAILABLE'`,
      [userId, bookId]
    );

    const createdLoan = await client.query(
      `INSERT INTO loans (user_id, book_id, due_date, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       RETURNING *`,
      [userId, bookId, dueDate]
    );

    return createdLoan.rows[0];
  });
}

export async function returnLoanForUser(userId: string, bookId: string) {
  return withTransaction(async (client) => {
    const activeLoan = await client.query(
      `SELECT * FROM loans
       WHERE user_id = $1 AND book_id = $2 AND status = 'ACTIVE'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, bookId]
    );

    if (activeLoan.rows.length === 0) {
      throw new HttpError(404, "Emprestimo ativo nao encontrado para este usuario e livro");
    }

    const finalizedLoan = await client.query(
      `UPDATE loans
       SET status = 'RETURNED', return_date = NOW()
       WHERE id = $1 AND status = 'ACTIVE'
       RETURNING *`,
      [activeLoan.rows[0].id]
    );

    if (finalizedLoan.rows.length === 0) {
      throw new HttpError(500, "Nao foi possivel finalizar o emprestimo");
    }

    const finalized = finalizedLoan.rows[0];

    await client.query(
      `UPDATE books
       SET available_copies = LEAST(total_copies, available_copies + 1)
       WHERE id = $1`,
      [bookId]
    );

    const fineAmount = await applyFineIfOverdue(client, userId, finalized.id, finalized.due_date);
    await processReservationQueueTx(client, bookId);

    return {
      loan: finalized,
      fineAmount
    };
  });
}

export async function returnLoanByIdForUser(userId: string, loanId: string) {
  return withTransaction(async (client) => {
    const activeLoan = await client.query(
      "SELECT * FROM loans WHERE id = $1 AND status = 'ACTIVE' LIMIT 1",
      [loanId]
    );

    if (activeLoan.rows.length === 0) {
      throw new HttpError(404, "Emprestimo ativo nao encontrado");
    }

    if (activeLoan.rows[0].user_id !== userId) {
      throw new HttpError(403, "Sem permissao para devolver este emprestimo");
    }

    const finalizedLoan = await client.query(
      `UPDATE loans
       SET status = 'RETURNED', return_date = NOW()
       WHERE id = $1 AND status = 'ACTIVE'
       RETURNING *`,
      [loanId]
    );

    if (finalizedLoan.rows.length === 0) {
      throw new HttpError(500, "Nao foi possivel finalizar o emprestimo");
    }

    const finalized = finalizedLoan.rows[0];

    await client.query(
      `UPDATE books
       SET available_copies = LEAST(total_copies, available_copies + 1)
       WHERE id = $1`,
      [finalized.book_id]
    );

    const fineAmount = await applyFineIfOverdue(client, userId, finalized.id, finalized.due_date);
    await processReservationQueueTx(client, finalized.book_id);

    return {
      loan: finalized,
      fineAmount
    };
  });
}

async function applyFineIfOverdue(
  client: { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> },
  userId: string,
  loanId: string,
  dueDate: string | Date
): Promise<number> {
  const now = new Date();
  if (now <= new Date(dueDate)) {
    return 0;
  }

  const overdueMs = now.getTime() - new Date(dueDate).getTime();
  const overdueDays = Math.ceil(overdueMs / (24 * 60 * 60 * 1000));
  const fineAmount = overdueDays * FINE_PER_DAY;

  await client.query(
    `INSERT INTO fines (user_id, loan_id, amount, paid)
     VALUES ($1, $2, $3, FALSE)`,
    [userId, loanId, fineAmount]
  );

  return fineAmount;
}

async function processReservationQueueTx(
  client: { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> },
  bookId: string
): Promise<void> {
  await client.query(
    `UPDATE reservations
     SET status = 'EXPIRED'
     WHERE book_id = $1
       AND status = 'AVAILABLE'
       AND expires_at IS NOT NULL
       AND expires_at < NOW()`,
    [bookId]
  );

  const next = await client.query(
    `SELECT id FROM reservations
     WHERE book_id = $1 AND status = 'QUEUED'
     ORDER BY created_at ASC
     LIMIT 1`,
    [bookId]
  );

  if (next.rows.length === 0) {
    return;
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await client.query(
    `UPDATE reservations
     SET status = 'AVAILABLE', expires_at = $2
     WHERE id = $1`,
    [next.rows[0].id, expiresAt]
  );
}
