import { useState } from "react";
import { useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Book, Loan } from "../types";

export default function LoansPage() {
  const { token, user } = useAuth();
  const [bookId, setBookId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [books, setBooks] = useState<Book[]>([]);

  const effectiveUserId = user?.role === "ADMIN" && targetUserId ? targetUserId : user?.id;

  async function loadActiveLoans() {
    if (!token || !effectiveUserId) {
      setActiveLoans([]);
      return;
    }

    const [history, allBooks] = await Promise.all([
      apiRequest<Loan[]>(`/loans/history/${effectiveUserId}`, { token }),
      apiRequest<Book[]>("/books")
    ]);

    setActiveLoans(history.filter((loan) => loan.status === "ACTIVE"));
    setBooks(allBooks);
  }

  useEffect(() => {
    loadActiveLoans().catch(() => {
      setActiveLoans([]);
      setBooks([]);
    });
  }, [token, effectiveUserId]);

  const booksMap = useMemo(() => {
    return new Map(books.map((book) => [book.id, book]));
  }, [books]);

  async function handleLoan(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    const payload: Record<string, string> = { bookId };
    if (user?.role === "ADMIN" && targetUserId) {
      payload.userId = targetUserId;
    }

    try {
      await apiRequest("/loans", {
        method: "POST",
        token,
        body: JSON.stringify(payload)
      });
      toast.success("Emprestimo criado com sucesso");
      loadActiveLoans().catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar emprestimo");
    }
  }

  async function handleReturnByLoanId(loanId: string) {
    if (!token) return;

    const payload: Record<string, string> = { loanId };
    if (user?.role === "ADMIN" && targetUserId) {
      payload.userId = targetUserId;
    }

    try {
      const response = await apiRequest<{ fineAmount: number }>("/returns", {
        method: "POST",
        token,
        body: JSON.stringify(payload)
      });

      if (response.fineAmount > 0) {
        toast.warn(`Devolucao registrada com multa de R$ ${response.fineAmount.toFixed(2)}`);
      } else {
        toast.success("Devolucao registrada sem multa");
      }
      loadActiveLoans().catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro na devolucao");
    }
  }

  return (
    <section>
      <header className="page-header">
        <h2>Emprestimos e Devolucoes</h2>
        <p>Solicite emprestimo e devolva sem digitar ID de livro.</p>
      </header>

      <form className="panel-form" onSubmit={handleLoan}>
        <label>
          Book ID (somente para criar emprestimo)
          <input value={bookId} onChange={(event) => setBookId(event.target.value)} required />
        </label>

        {user?.role === "ADMIN" && (
          <label>
            User ID (opcional)
            <input value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} />
          </label>
        )}

        <div className="row-actions">
          <button type="submit">Solicitar Emprestimo</button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Livro</th>
              <th>Vencimento</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {activeLoans.map((loan) => {
              const book = booksMap.get(loan.book_id);
              return (
                <tr key={loan.id}>
                  <td>{loan.id}</td>
                  <td>{book ? `${book.title} (${book.author})` : loan.book_id}</td>
                  <td>{new Date(loan.due_date).toLocaleDateString()}</td>
                  <td>
                    <button type="button" onClick={() => handleReturnByLoanId(loan.id)}>
                      Devolver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
