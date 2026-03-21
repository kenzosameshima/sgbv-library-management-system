import { query } from "../config/db";
import { Role, User } from "../models/types";

export async function countUsers(): Promise<number> {
  const rows = await query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
  return Number(rows[0]?.count ?? 0);
}

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.email.toLowerCase(), data.passwordHash, data.role]
  );

  return rows[0];
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await query<User>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const rows = await query<User>("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}
