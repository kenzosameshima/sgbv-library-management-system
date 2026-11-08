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
