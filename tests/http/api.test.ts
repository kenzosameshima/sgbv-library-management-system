import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import bcrypt from "bcrypt";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = new PGlite();

vi.mock("../../src/config/db", () => ({
  query: async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows,
  withTransaction: <T>(callback: (client: unknown) => Promise<T>) =>
    db.transaction((tx) => callback({ query: async (text: string, params: unknown[] = []) => tx.query(text, params) }))
}));

import app from "../../src/app";
import { signAccessToken } from "../../src/utils/jwt";

const schema = readFileSync("config/schema.sql", "utf8").replace(/CREATE EXTENSION[^;]*;/, "");
const PASSWORD = "correct-horse-battery";
const CSRF = "csrf-token-for-tests";

type Role = "USER" | "ADMIN";
interface Account {
  id: string;
  email: string;
  role: Role;
}

let seq = 0;

async function seedUser(role: Role = "USER"): Promise<Account> {
  seq += 1;
  const email = `person${seq}@example.com`;
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
    [`Person ${seq}`, email, await bcrypt.hash(PASSWORD, 4), role]
  );
  return { id: rows[0].id, email, role };
}

async function seedBook(totalCopies = 1, availableCopies = totalCopies): Promise<string> {
  seq += 1;
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO books (title, author, category, isbn, total_copies, available_copies)
     VALUES ('Book', 'Author', 'Cat', $1, $2, $3) RETURNING id`,
    [`isbn-${seq}`, totalCopies, availableCopies]
  );
  return rows[0].id;
}

/** Authenticated, CSRF-protected request builder. */
function as(account: Account) {
  const token = signAccessToken(account);
  return {
    post: (path: string) =>
      request(app).post(path).set("Authorization", `Bearer ${token}`).set("Cookie", `sgb_csrf=${CSRF}`).set("X-CSRF-Token", CSRF),
    get: (path: string) => request(app).get(path).set("Authorization", `Bearer ${token}`)
  };
}

function cookieValue(setCookie: string[] | undefined, name: string): string {
  const header = (setCookie ?? []).find((c) => c.startsWith(`${name}=`));
  return header?.split(";")[0].slice(name.length + 1) ?? "";
}

function login(email: string, password = PASSWORD) {
  return request(app).post("/api/v1/auth/login").set("X-Bypass-Rate-Limit", "true").send({ email, password });
}

async function session(account: Account) {
  const cookies = (await login(account.email)).headers["set-cookie"] as unknown as string[];
  const csrf = cookieValue(cookies, "sgb_csrf");
  return {
    cookies,
    refreshToken: cookieValue(cookies, "sgb_rt"),
    post: (path: string) => request(app).post(path).set("Cookie", `sgb_csrf=${csrf}`).set("X-CSRF-Token", csrf)
  };
}

beforeEach(async () => {
  await db.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await db.exec(schema);
});

describe("health", () => {
  it("answers without authentication", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("CSRF protection", () => {
  it("rejects a state-changing request with no CSRF token", async () => {
    const user = await seedUser();

    const res = await request(app)
      .post("/api/v1/loans")
      .set("Authorization", `Bearer ${signAccessToken(user)}`)
      .send({ bookId: await seedBook() });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CSRF_INVALID");
  });

  it("rejects a header that does not match the cookie", async () => {
    const user = await seedUser();

    const res = await request(app)
      .post("/api/v1/loans")
      .set("Authorization", `Bearer ${signAccessToken(user)}`)
      .set("Cookie", `sgb_csrf=${CSRF}`)
      .set("X-CSRF-Token", "something-else")
      .send({ bookId: await seedBook() });

    expect(res.status).toBe(403);
  });

  it("does not require a token for reads", async () => {
    const res = await request(app).get("/api/v1/books");

    expect(res.status).toBe(200);
  });
});

describe("authentication", () => {
  it("rejects a request without credentials", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
  });

  it("rejects a malformed token", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer not-a-jwt");

    expect(res.status).toBe(401);
  });

  it("rejects a wrong password and an unknown email the same way", async () => {
    const user = await seedUser();

    const wrongPassword = await login(user.email, "wrong-password");
    const unknownEmail = await login("nobody@example.com");

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it("logs in with HttpOnly session cookies and identifies the user", async () => {
    const user = await seedUser();

    const res = await login(user.email);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: user.email, role: "USER" });
    expect(res.body.user).not.toHaveProperty("password_hash");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.find((c) => c.startsWith("sgb_at="))).toContain("HttpOnly");
    expect(cookies.find((c) => c.startsWith("sgb_rt="))).toContain("HttpOnly");

    const me = await request(app).get("/api/v1/auth/me").set("Cookie", `sgb_at=${cookieValue(cookies, "sgb_at")}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ id: user.id });
  });

  it("rotates the refresh token and refuses to accept the old one again", async () => {
    const s = await session(await seedUser());

    const first = await s.post("/api/v1/auth/refresh").send({ refreshToken: s.refreshToken });
    const replay = await s.post("/api/v1/auth/refresh").send({ refreshToken: s.refreshToken });

    expect(first.status).toBe(200);
    expect(replay.status).toBe(401);
  });

  it("revokes the refresh token on logout", async () => {
    const s = await session(await seedUser());

    const out = await s.post("/api/v1/auth/logout").send({ refreshToken: s.refreshToken });
    const after = await s.post("/api/v1/auth/refresh").send({ refreshToken: s.refreshToken });

    expect(out.status).toBe(204);
    expect(after.status).toBe(401);
  });
});

describe("books", () => {
  const book = { title: "Dom Casmurro", author: "Machado de Assis", category: "Romance", isbn: "9788535911664", totalCopies: 2 };

  it("lets an admin create a book and anyone list it", async () => {
    const admin = await seedUser("ADMIN");

    const created = await as(admin).post("/api/v1/books").send(book);
    const listed = await request(app).get("/api/v1/books");

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: "Dom Casmurro", total_copies: 2, available_copies: 2 });
    expect(listed.body).toHaveLength(1);
  });

  it("forbids a regular user from creating a book", async () => {
    const user = await seedUser();

    const res = await as(user).post("/api/v1/books").send(book);

    expect(res.status).toBe(403);
  });

  it("rejects an invalid payload with a validation error", async () => {
    const admin = await seedUser("ADMIN");

    const res = await as(admin).post("/api/v1/books").send({ ...book, totalCopies: -1 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("loans and returns over HTTP", () => {
  it("lends a book to the caller and ignores a userId supplied by a non-admin", async () => {
    const [caller, victim] = [await seedUser(), await seedUser()];
    const bookId = await seedBook(2);

    const res = await as(caller).post("/api/v1/loans").send({ bookId, userId: victim.id });

    expect(res.status).toBe(201);
    expect(res.body.user_id).toBe(caller.id);
  });

  it("lets an admin lend on behalf of a user", async () => {
    const [admin, user] = [await seedUser("ADMIN"), await seedUser()];
    const bookId = await seedBook(1);

    const res = await as(admin).post("/api/v1/loans").send({ bookId, userId: user.id });

    expect(res.status).toBe(201);
    expect(res.body.user_id).toBe(user.id);
  });

  it("answers 400 with a reservation hint when no copy is left", async () => {
    const user = await seedUser();
    const bookId = await seedBook(1, 0);

    const res = await as(user).post("/api/v1/loans").send({ bookId });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/reserva/i);
  });

  it("returns a loan by book and frees the copy", async () => {
    const user = await seedUser();
    const bookId = await seedBook(1);
    await as(user).post("/api/v1/loans").send({ bookId });

    const res = await as(user).post("/api/v1/returns").send({ bookId });

    expect(res.status).toBe(200);
    expect(res.body.fineAmount).toBe(0);
    const { rows } = await db.query<{ available_copies: number }>("SELECT available_copies FROM books WHERE id = $1", [bookId]);
    expect(rows[0].available_copies).toBe(1);
  });

  it("requires bookId or loanId to return", async () => {
    const user = await seedUser();

    const res = await as(user).post("/api/v1/returns").send({});

    expect(res.status).toBe(400);
  });

  it("shows loan history to its owner and to admins but not to others", async () => {
    const [owner, other, admin] = [await seedUser(), await seedUser(), await seedUser("ADMIN")];

    expect((await as(owner).get(`/api/v1/loans/history/${owner.id}`)).status).toBe(200);
    expect((await as(admin).get(`/api/v1/loans/history/${owner.id}`)).status).toBe(200);
    expect((await as(other).get(`/api/v1/loans/history/${owner.id}`)).status).toBe(403);
  });
});

describe("reservations", () => {
  it("refuses to reserve a book that is available", async () => {
    const user = await seedUser();

    const res = await as(user).post("/api/v1/reservations").send({ bookId: await seedBook(1) });

    expect(res.status).toBe(400);
  });

  it("queues a reservation for an unavailable book and rejects a duplicate", async () => {
    const user = await seedUser();
    const bookId = await seedBook(1, 0);

    const first = await as(user).post("/api/v1/reservations").send({ bookId });
    const duplicate = await as(user).post("/api/v1/reservations").send({ bookId });

    expect(first.status).toBe(201);
    expect(first.body.status).toBe("QUEUED");
    expect(duplicate.status).toBe(409);
  });

  it("answers 404 for an unknown book", async () => {
    const user = await seedUser();

    const res = await as(user).post("/api/v1/reservations").send({ bookId: "00000000-0000-4000-8000-000000000000" });

    expect(res.status).toBe(404);
  });

  it("hands a returned copy to the queue and keeps strangers from taking it", async () => {
    const [borrower, waiting, stranger] = [await seedUser(), await seedUser(), await seedUser()];
    const bookId = await seedBook(1);
    await as(borrower).post("/api/v1/loans").send({ bookId });
    await as(waiting).post("/api/v1/reservations").send({ bookId });

    await as(borrower).post("/api/v1/returns").send({ bookId });

    expect((await as(stranger).post("/api/v1/loans").send({ bookId })).status).toBe(400);
    expect((await as(waiting).post("/api/v1/loans").send({ bookId })).status).toBe(201);
  });
});
