export type Role = "USER" | "ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  total_copies: number;
  available_copies: number;
}

export interface Loan {
  id: string;
  user_id: string;
  book_id: string;
  loan_date: string;
  due_date: string;
  return_date: string | null;
  status: "ACTIVE" | "RETURNED";
}

export interface Fine {
  id: string;
  user_id: string;
  loan_id: string;
  amount: number;
  paid: boolean;
  created_at: string;
  paid_at: string | null;
}

export interface Reservation {
  id: string;
  userId: string;
  bookId: string;
  createdAt: string;
}
