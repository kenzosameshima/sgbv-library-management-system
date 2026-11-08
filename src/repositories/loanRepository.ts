import { query } from "../config/db";
import { Loan } from "../models/types";

export async function listLoansByUser(userId: string): Promise<Loan[]> {
  return query<Loan>("SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
}
