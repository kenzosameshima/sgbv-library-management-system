export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: Date;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  total_copies: number;
  available_copies: number;
  created_at: Date;
}

export interface Loan {
  id: string;
  user_id: string;
  book_id: string;
  loan_date: Date;
  due_date: Date;
  return_date: Date | null;
  status: "ACTIVE" | "RETURNED";
  created_at: Date;
}

export interface Reservation {
  id: string;
  user_id: string;
  book_id: string;
  status: "QUEUED" | "AVAILABLE" | "EXPIRED" | "FULFILLED";
  created_at: Date;
  expires_at: Date | null;
}

export interface Fine {
  id: string;
  user_id: string;
  loan_id: string;
  amount: number;
  paid: boolean;
  created_at: Date;
  paid_at: Date | null;
}
