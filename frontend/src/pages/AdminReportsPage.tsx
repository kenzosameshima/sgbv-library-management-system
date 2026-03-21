import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Loan } from "../types";

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [userId, setUserId] = useState("");
  const [report, setReport] = useState<Loan[]>([]);

  async function loadReport(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    try {
      const data = await apiRequest<Loan[]>(`/loans/history/${userId}`, { token });
      setReport(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar relatorio");
    }
  }

  const active = report.filter((loan) => loan.status === "ACTIVE").length;
  const returned = report.filter((loan) => loan.status === "RETURNED").length;

  return (
    <section>
      <header className="page-header">
        <h2>Relatorios Simples</h2>
        <p>Resumo de emprestimos por usuario.</p>
      </header>

      <form className="inline-form" onSubmit={loadReport}>
        <input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="User ID" required />
        <button type="submit">Gerar</button>
      </form>

      <div className="cards-grid">
        <article className="stat-card">
          <h3>Total de Registros</h3>
          <p>{report.length}</p>
        </article>
        <article className="stat-card">
          <h3>Ativos</h3>
          <p>{active}</p>
        </article>
        <article className="stat-card">
          <h3>Finalizados</h3>
          <p>{returned}</p>
        </article>
      </div>
    </section>
  );
}
