import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Fine } from "../types";

export default function AdminFinesPage() {
  const { token } = useAuth();
  const [userId, setUserId] = useState("");
  const [fines, setFines] = useState<Fine[]>([]);

  async function fetchFines(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    try {
      const data = await apiRequest<Fine[]>(`/users/${userId}/fines`, { token });
      setFines(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao consultar multas");
    }
  }

  async function payFine(fineId: string) {
    if (!token) return;

    try {
      await apiRequest("/users/fines/pay", {
        method: "POST",
        token,
        body: JSON.stringify({ fineId })
      });
      toast.success("Pagamento de multa registrado");
      setFines((current) => current.map((fine) => (fine.id === fineId ? { ...fine, paid: true } : fine)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao pagar multa");
    }
  }

  return (
    <section>
      <header className="page-header">
        <h2>Gerenciar Multas</h2>
        <p>Consulte multas de um usuario e registre pagamentos.</p>
      </header>

      <form className="inline-form" onSubmit={fetchFines}>
        <input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          placeholder="User ID"
          required
        />
        <button type="submit">Consultar</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fine ID</th>
              <th>Loan ID</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {fines.map((fine) => (
              <tr key={fine.id}>
                <td>{fine.id}</td>
                <td>{fine.loan_id}</td>
                <td>R$ {fine.amount.toFixed(2)}</td>
                <td>{fine.paid ? "Paga" : "Pendente"}</td>
                <td>
                  <button disabled={fine.paid} onClick={() => payFine(fine.id)}>
                    Registrar Pagamento
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
