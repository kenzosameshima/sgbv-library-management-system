import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { LOCAL_RESERVATIONS_KEY } from "../constants";

interface LocalReservation {
  bookId: string;
  createdAt: string;
}

export default function ReservationsPage() {
  const { token } = useAuth();
  const [bookId, setBookId] = useState("");
  const [localReservations, setLocalReservations] = useState<LocalReservation[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(LOCAL_RESERVATIONS_KEY) ?? "[]") as LocalReservation[];
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
      localStorage.setItem(LOCAL_RESERVATIONS_KEY, JSON.stringify(next));
      setLocalReservations(next);
      toast.success("Reservation added to the FIFO queue");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create reservation");
    }
  }

  return (
    <section>
      <header className="page-header">
        <h2>Reservations</h2>
        <p>Reserve unavailable books and track recent requests.</p>
      </header>

      <form className="panel-form" onSubmit={handleReserve}>
        <label>
          Unavailable book ID
          <input value={bookId} onChange={(event) => setBookId(event.target.value)} required />
        </label>
        <button type="submit">Create Reservation</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Book ID</th>
              <th>Created at</th>
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
