import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface LocalReservation {
  bookId: string;
  createdAt: string;
}

export default function ReservationsPage() {
  const { token } = useAuth();
  const [bookId, setBookId] = useState("");
  const [localReservations, setLocalReservations] = useState<LocalReservation[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("sgb_reservations") ?? "[]") as LocalReservation[];
    setLocalReservations(stored);
  }, []);

  async function handleReserve(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    try {
      await apiRequest("/reservations", {
        method: "POST",
        token,
        body: JSON.stringify({ bookId })
      });

      const next = [...localReservations, { bookId, createdAt: new Date().toISOString() }];
      localStorage.setItem("sgb_reservations", JSON.stringify(next));
      setLocalReservations(next);
      toast.success("Reserva enviada para fila FIFO");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reservar");
    }
  }

  return (
    <section>
      <header className="page-header">
        <h2>Reservas</h2>
        <p>Reserve livros indisponiveis e acompanhe solicitacoes recentes.</p>
      </header>

      <form className="panel-form" onSubmit={handleReserve}>
        <label>
          Book ID indisponivel
          <input value={bookId} onChange={(event) => setBookId(event.target.value)} required />
        </label>
        <button type="submit">Criar Reserva</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Book ID</th>
              <th>Criada em</th>
            </tr>
          </thead>
          <tbody>
            {localReservations.map((reservation) => (
              <tr key={`${reservation.bookId}-${reservation.createdAt}`}>
                <td>{reservation.bookId}</td>
                <td>{new Date(reservation.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
