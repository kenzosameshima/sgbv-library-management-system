import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Fine } from "../types";
import { formatMoney } from "../constants";

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
      toast.error(error instanceof Error ? error.message : "Could not load fines");
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
      toast.success("Fine payment recorded");
      setFines((current) => current.map((fine) => (fine.id === fineId ? { ...fine, paid: true } : fine)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not pay fine");
    }
  }

  return (
    <section>
      <header className="page-header">
        <h2>Manage Fines</h2>
        <p>Look up a user's fines and record payments.</p>
      </header>

      <form className="inline-form" onSubmit={fetchFines}>
        <input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          placeholder="User ID"
          required
        />
        <button type="submit">Look up</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fine ID</th>
              <th>Loan ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fines.map((fine) => (
              <tr key={fine.id}>
                <td>{fine.id}</td>
                <td>{fine.loan_id}</td>
                <td>{formatMoney(fine.amount)}</td>
                <td>{fine.paid ? "Paid" : "Pending"}</td>
                <td>
                  <button disabled={fine.paid} onClick={() => payFine(fine.id)}>
                    Record Payment
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
