import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = new PGlite();

// Real SQL runs against PGlite; only the pg connection is replaced.
vi.mock("../../src/config/db", () => ({
  query: async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows
}));

import { createBook, findBookById, updateBook } from "../../src/repositories/bookRepository";

const schema = readFileSync("config/schema.sql", "utf8").replace(/CREATE EXTENSION[^;]*;/, "");

const details = { title: "Dom Casmurro", author: "Machado de Assis", category: "Romance", isbn: "9788535911664" };

async function bookWithLoans(totalCopies: number, onLoan: number) {
  const book = await createBook({ ...details, totalCopies });
  await db.query("UPDATE books SET available_copies = available_copies - $2 WHERE id = $1", [book.id, onLoan]);
  return book;
}

beforeEach(async () => {
  await db.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await db.exec(schema);
});

describe("updateBook", () => {
  it("adds new copies to availability when the total is raised", async () => {
    const book = await bookWithLoans(3, 1);

    const updated = await updateBook(book.id, { ...details, totalCopies: 5 });

    expect(updated).toMatchObject({ total_copies: 5, available_copies: 4 });
  });

  it("removes only unborrowed copies when the total is lowered", async () => {
    const book = await bookWithLoans(5, 2);

    const updated = await updateBook(book.id, { ...details, totalCopies: 3 });

    expect(updated).toMatchObject({ total_copies: 3, available_copies: 1 });
  });

  it("refuses a total below the number of copies on loan and leaves the book unchanged", async () => {
    const book = await bookWithLoans(5, 3);

    const updated = await updateBook(book.id, { ...details, totalCopies: 2 });

    expect(updated).toBeNull();
    expect(await findBookById(book.id)).toMatchObject({ total_copies: 5, available_copies: 2 });
  });
});
