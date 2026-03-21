import { query } from "../config/db";
import { Book } from "../models/types";

export async function createBook(data: {
  title: string;
  author: string;
  category: string;
  isbn: string;
  totalCopies: number;
}): Promise<Book> {
  const rows = await query<Book>(
    `INSERT INTO books (title, author, category, isbn, total_copies, available_copies)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING *`,
    [data.title, data.author, data.category, data.isbn, data.totalCopies]
  );

  return rows[0];
}

export async function updateBook(id: string, data: {
  title: string;
  author: string;
  category: string;
  isbn: string;
  totalCopies: number;
}): Promise<Book | null> {
  const rows = await query<Book>(
    `UPDATE books
     SET title = $2,
         author = $3,
         category = $4,
         isbn = $5,
         total_copies = $6,
         available_copies = LEAST(available_copies, $6)
     WHERE id = $1
     RETURNING *`,
    [id, data.title, data.author, data.category, data.isbn, data.totalCopies]
  );

  return rows[0] ?? null;
}

export async function deleteBook(id: string): Promise<void> {
  await query("DELETE FROM books WHERE id = $1", [id]);
}

export async function findBookById(id: string): Promise<Book | null> {
  const rows = await query<Book>("SELECT * FROM books WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function listBooks(filters: { title?: string; author?: string; category?: string }): Promise<Book[]> {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters.title) {
    params.push(`%${filters.title}%`);
    conditions.push(`title ILIKE $${params.length}`);
  }

  if (filters.author) {
    params.push(`%${filters.author}%`);
    conditions.push(`author ILIKE $${params.length}`);
  }

  if (filters.category) {
    params.push(`%${filters.category}%`);
    conditions.push(`category ILIKE $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<Book>(`SELECT * FROM books ${where} ORDER BY title`, params);
}

export async function decrementAvailability(bookId: string): Promise<void> {
  await query("UPDATE books SET available_copies = available_copies - 1 WHERE id = $1", [bookId]);
}

export async function incrementAvailability(bookId: string): Promise<void> {
  await query("UPDATE books SET available_copies = available_copies + 1 WHERE id = $1", [bookId]);
}
