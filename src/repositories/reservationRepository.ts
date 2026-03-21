import { query } from "../config/db";
import { Reservation } from "../models/types";

export async function hasUserQueuedReservation(userId: string, bookId: string): Promise<boolean> {
  const rows = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM reservations WHERE user_id = $1 AND book_id = $2 AND status IN ('QUEUED', 'AVAILABLE')",
    [userId, bookId]
  );

  return Number(rows[0]?.count ?? 0) > 0;
}

export async function createQueuedReservation(data: { userId: string; bookId: string }): Promise<Reservation> {
  const rows = await query<Reservation>(
    `INSERT INTO reservations (user_id, book_id, status)
     VALUES ($1, $2, 'QUEUED')
     RETURNING *`,
    [data.userId, data.bookId]
  );

  return rows[0];
}

export async function expireAvailableReservations(bookId: string): Promise<void> {
  await query(
    `UPDATE reservations
     SET status = 'EXPIRED'
     WHERE book_id = $1
       AND status = 'AVAILABLE'
       AND expires_at IS NOT NULL
       AND expires_at < NOW()`,
    [bookId]
  );
}

export async function getNextQueuedReservation(bookId: string): Promise<Reservation | null> {
  const rows = await query<Reservation>(
    `SELECT * FROM reservations
     WHERE book_id = $1 AND status = 'QUEUED'
     ORDER BY created_at ASC
     LIMIT 1`,
    [bookId]
  );

  return rows[0] ?? null;
}

export async function markReservationAvailable(reservationId: string, expiresAt: Date): Promise<Reservation | null> {
  const rows = await query<Reservation>(
    `UPDATE reservations
     SET status = 'AVAILABLE', expires_at = $2
     WHERE id = $1
     RETURNING *`,
    [reservationId, expiresAt]
  );

  return rows[0] ?? null;
}

export async function fulfillReservation(userId: string, bookId: string): Promise<void> {
  await query(
    `UPDATE reservations
     SET status = 'FULFILLED'
     WHERE user_id = $1 AND book_id = $2 AND status = 'AVAILABLE'`,
    [userId, bookId]
  );
}

export async function listReservationsByBook(bookId: string): Promise<Reservation[]> {
  return query<Reservation>(
    "SELECT * FROM reservations WHERE book_id = $1 ORDER BY created_at ASC",
    [bookId]
  );
}
