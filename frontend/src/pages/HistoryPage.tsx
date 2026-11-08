import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import type { Loan } from "../types";

const PAGE_SIZE = 8;

export default function HistoryPage() {
  const { token, user } = useAuth();
  const [history, setHistory] = useState<Loan[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      if (!token || !user) return;
      const data = await apiRequest<Loan[]>(`/loans/history/${user.id}`, { token });
      setHistory(data);
      setPage(1);
    }

    load().catch(() => {
      setHistory([]);
    });
  }, [token, user]);

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const pageItems = useMemo(() => history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [history, page]);

  return (
    <section>
      <header className="page-header">
        <h2>History</h2>
        <p>Loans and returns of the signed-in user.</p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Book ID</th>
              <th>Status</th>
              <th>Loan</th>
              <th>Return</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.book_id}</td>
                <td>{item.status}</td>
                <td>{new Date(item.loan_date).toLocaleDateString()}</td>
                <td>{item.return_date ? new Date(item.return_date).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
      </div>
    </section>
  );
}
