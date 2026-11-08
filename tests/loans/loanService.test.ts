import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = new PGlite();

// Real SQL runs against PGlite; only the pg connection is replaced.
// PGlite transactions are exclusive, which models serialised commits.
vi.mock("../../src/config/db", () => ({
  query: async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows,
  withTransaction: <T>(callback: (client: unknown) => Promise<T>) =>
    db.transaction((tx) => callback({ query: async (text: string, params: unknown[] = []) => tx.query(text, params) }))
}));

import { createLoanForUser, returnLoanByIdForUser, returnLoanForUser } from "../../src/services/loanService";
import { FINE_PER_DAY, MAX_ACTIVE_LOANS } from "../../src/utils/constants";

const schema = readFileSync("config/schema.sql", "utf8").replace(/CREATE EXTENSION[^;]*;/, "");
const DAY_MS = 24 * 60 * 60 * 1000;

let seq = 0;

async function seedUser(): Promise<string> {
  seq += 1;
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, 'x', 'USER') RETURNING id",
    [`User ${seq}`, `user${seq}@example.com`]
  );
  return rows[0].id;
}

async function seedBook(totalCopies = 1): Promise<string> {
  seq += 1;
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO books (title, author, category, isbn, total_copies, available_copies)
     VALUES ('Book', 'Author', 'Cat', $1, $2, $2) RETURNING id`,
    [`isbn-${seq}`, totalCopies]
  );
  return rows[0].id;
}

async function copiesAvailable(bookId: string): Promise<number> {
  const { rows } = await db.query<{ available_copies: number }>("SELECT available_copies FROM books WHERE id = $1", [bookId]);
  return rows[0].available_copies;
}

async function reservation(userId: string, bookId: string, status: string, createdOffsetMs = 0) {
  await db.query(
    `INSERT INTO reservations (user_id, book_id, status, created_at, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' milliseconds')::interval, $5)`,
    [userId, bookId, status, String(createdOffsetMs), status === "AVAILABLE" ? new Date(Date.now() + DAY_MS) : null]
  );
}

async function reservationStatus(userId: string, bookId: string): Promise<string> {
  const { rows } = await db.query<{ status: string }>(
    "SELECT status FROM reservations WHERE user_id = $1 AND book_id = $2",
    [userId, bookId]
  );
  return rows[0].status;
}

async function makeOverdue(loanId: string, msLate: number) {
  await db.query("UPDATE loans SET due_date = $2 WHERE id = $1", [loanId, new Date(Date.now() - msLate)]);
}

beforeEach(async () => {
  await db.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await db.exec(schema);
});

describe("createLoanForUser", () => {
  it("lends a copy and decrements availability", async () => {
    const user = await seedUser();
    const book = await seedBook(2);

    const loan = await createLoanForUser(user, book);

    expect(loan).toMatchObject({ user_id: user, book_id: book, status: "ACTIVE" });
    expect(await copiesAvailable(book)).toBe(1);
  });

  it("rejects an unknown user", async () => {
    const book = await seedBook();

    await expect(createLoanForUser("00000000-0000-0000-0000-000000000000", book)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects an unknown book", async () => {
    const user = await seedUser();

    await expect(createLoanForUser(user, "00000000-0000-0000-0000-000000000000")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects a user with unpaid fines", async () => {
    const user = await seedUser();
    const first = await seedBook();
    const second = await seedBook();
    const loan = await createLoanForUser(user, first);
    await makeOverdue(loan.id, 2 * DAY_MS);
    await returnLoanByIdForUser(user, loan.id);

    await expect(createLoanForUser(user, second)).rejects.toMatchObject({ statusCode: 400 });
    expect(await copiesAvailable(second)).toBe(1);
  });

  it("rejects a book with no copies left", async () => {
    const [first, second] = [await seedUser(), await seedUser()];
    const book = await seedBook(1);
    await createLoanForUser(first, book);

    await expect(createLoanForUser(second, book)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("never exceeds the active loan limit under concurrent requests", async () => {
    const user = await seedUser();
    const books = await Promise.all(Array.from({ length: MAX_ACTIVE_LOANS + 3 }, () => seedBook()));

    const results = await Promise.allSettled(books.map((book) => createLoanForUser(user, book)));

    const { rows } = await db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM loans WHERE user_id = $1 AND status = 'ACTIVE'", [user]);
    expect(rows[0].count).toBe(MAX_ACTIVE_LOANS);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(MAX_ACTIVE_LOANS);
  });

  it("lends the last copy to only one of two concurrent borrowers", async () => {
    const [first, second] = [await seedUser(), await seedUser()];
    const book = await seedBook(1);

    const results = await Promise.allSettled([createLoanForUser(first, book), createLoanForUser(second, book)]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await copiesAvailable(book)).toBe(0);
  });

  it("keeps a copy held for another user's reservation out of reach", async () => {
    const [holder, other] = [await seedUser(), await seedUser()];
    const book = await seedBook(1);
    await reservation(holder, book, "AVAILABLE");

    await expect(createLoanForUser(other, book)).rejects.toMatchObject({ statusCode: 400 });
    expect(await copiesAvailable(book)).toBe(1);
  });

  it("lets the reservation holder borrow and marks the reservation fulfilled", async () => {
    const holder = await seedUser();
    const book = await seedBook(1);
    await reservation(holder, book, "AVAILABLE");

    await createLoanForUser(holder, book);

    expect(await reservationStatus(holder, book)).toBe("FULFILLED");
  });

  it("ignores an expired reservation hold", async () => {
    const [holder, other] = [await seedUser(), await seedUser()];
    const book = await seedBook(1);
    await db.query(
      "INSERT INTO reservations (user_id, book_id, status, expires_at) VALUES ($1, $2, 'AVAILABLE', NOW() - INTERVAL '1 hour')",
      [holder, book]
    );

    await expect(createLoanForUser(other, book)).resolves.toMatchObject({ status: "ACTIVE" });
  });
});

describe("returning a loan", () => {
  const strategies = [
    ["by book", (user: string, book: string, _loan: string) => returnLoanForUser(user, book)],
    ["by loan id", (user: string, _book: string, loan: string) => returnLoanByIdForUser(user, loan)]
  ] as const;

  describe.each(strategies)("%s", (_name, giveBack) => {
    it("restores availability and reports no fine when on time", async () => {
      const user = await seedUser();
      const book = await seedBook(1);
      const loan = await createLoanForUser(user, book);

      const result = await giveBack(user, book, loan.id);

      expect(result.loan).toMatchObject({ id: loan.id, status: "RETURNED" });
      expect(result.fineAmount).toBe(0);
      expect(await copiesAvailable(book)).toBe(1);
    });

    it("fines each started overdue day", async () => {
      const user = await seedUser();
      const book = await seedBook(1);
      const loan = await createLoanForUser(user, book);
      await makeOverdue(loan.id, 2.5 * DAY_MS);

      const result = await giveBack(user, book, loan.id);

      expect(result.fineAmount).toBe(3 * FINE_PER_DAY);
      const { rows } = await db.query<{ amount: string; paid: boolean }>("SELECT amount, paid FROM fines WHERE loan_id = $1", [loan.id]);
      expect(rows).toEqual([{ amount: String((3 * FINE_PER_DAY).toFixed(2)), paid: false }]);
    });

    it("offers the copy to the first queued reservation", async () => {
      const [borrower, first, second] = [await seedUser(), await seedUser(), await seedUser()];
      const book = await seedBook(1);
      const loan = await createLoanForUser(borrower, book);
      await reservation(first, book, "QUEUED", 0);
      await reservation(second, book, "QUEUED", 10);

      await giveBack(borrower, book, loan.id);

      expect(await reservationStatus(first, book)).toBe("AVAILABLE");
      expect(await reservationStatus(second, book)).toBe("QUEUED");
    });

    it("lets a second return of the same loan fail without touching availability", async () => {
      const user = await seedUser();
      const book = await seedBook(1);
      const loan = await createLoanForUser(user, book);
      await giveBack(user, book, loan.id);

      await expect(giveBack(user, book, loan.id)).rejects.toMatchObject({ statusCode: 404 });
      expect(await copiesAvailable(book)).toBe(1);
    });

    it("counts a copy once when the same loan is returned concurrently", async () => {
      const user = await seedUser();
      const book = await seedBook(2);
      const loan = await createLoanForUser(user, book);

      const results = await Promise.allSettled([giveBack(user, book, loan.id), giveBack(user, book, loan.id)]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await copiesAvailable(book)).toBe(2);
    });
  });

  it("refuses to return someone else's loan by id", async () => {
    const [owner, stranger] = [await seedUser(), await seedUser()];
    const book = await seedBook(1);
    const loan = await createLoanForUser(owner, book);

    await expect(returnLoanByIdForUser(stranger, loan.id)).rejects.toMatchObject({ statusCode: 403 });
    expect(await copiesAvailable(book)).toBe(0);
  });
});
