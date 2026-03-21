import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import type { Book, Fine, Loan } from "../types";
import StatCard from "../components/StatCard";

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
        <h2>{user?.role === "ADMIN" ? "Dashboard Admin" : "Dashboard Usuario"}</h2>
        <p>Visao rapida das operacoes da biblioteca.</p>
      </header>

      <div className="cards-grid">
        <StatCard title="Emprestimos Ativos" value={stats.activeLoans} helper="Limite de 5 ativos por usuario" />
        <StatCard title="Multas Pendentes" value={stats.pendingFines} helper={`R$ ${stats.pendingFinesAmount.toFixed(2)}`} />
        <StatCard title="Livros no Acervo" value={books.length} />
        <StatCard title="Livros Indisponiveis" value={stats.unavailableBooks} helper="Sugestao: fluxo de reserva" />
      </div>
    </section>
  );
}
