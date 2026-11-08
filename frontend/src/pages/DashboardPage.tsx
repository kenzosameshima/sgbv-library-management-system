import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import type { Book, Fine, Loan } from "../types";
import StatCard from "../components/StatCard";
import { MAX_ACTIVE_LOANS, formatMoney } from "../constants";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    async function load() {
      if (!user || !token) {
        return;
      }

      const [loanData, fineData, bookData] = await Promise.all([
        apiRequest<Loan[]>(`/loans/history/${user.id}`, { token }),
        apiRequest<Fine[]>(`/users/${user.id}/fines`, { token }),
        apiRequest<Book[]>("/books")
      ]);

      setLoans(loanData);
      setFines(fineData);
      setBooks(bookData);
    }

    load().catch(() => {
      setLoans([]);
      setFines([]);
      setBooks([]);
    });
  }, [token, user]);

  const stats = useMemo(() => {
    const activeLoans = loans.filter((loan) => loan.status === "ACTIVE").length;
    const pendingFines = fines.filter((fine) => !fine.paid).length;
    const pendingFinesAmount = fines
      .filter((fine) => !fine.paid)
      .reduce((total, fine) => total + fine.amount, 0);

    const unavailableBooks = books.filter((book) => book.available_copies === 0).length;

    return { activeLoans, pendingFines, pendingFinesAmount, unavailableBooks };
  }, [fines, loans, books]);

  return (
    <section>
      <header className="page-header">
        <h2>{user?.role === "ADMIN" ? "Admin Dashboard" : "User Dashboard"}</h2>
        <p>Quick overview of library operations.</p>
      </header>

      <div className="cards-grid">
        <StatCard title="Active Loans" value={stats.activeLoans} helper={`Limit of ${MAX_ACTIVE_LOANS} active loans per user`} />
        <StatCard title="Pending Fines" value={stats.pendingFines} helper={formatMoney(stats.pendingFinesAmount)} />
        <StatCard title="Books in Catalog" value={books.length} />
        <StatCard title="Unavailable Books" value={stats.unavailableBooks} helper="Tip: use the reservation flow" />
      </div>
    </section>
  );
}
