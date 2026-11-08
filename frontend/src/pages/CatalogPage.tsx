import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Book } from "../types";
import { LOCAL_RESERVATIONS_KEY } from "../constants";

const PAGE_SIZE = 6;

export default function CatalogPage() {
  const { token } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  async function fetchBooks() {
    const query = new URLSearchParams();
    if (title) query.set("title", title);
    if (author) query.set("author", author);
    if (category) query.set("category", category);

    const data = await apiRequest<Book[]>(`/books${query.toString() ? `?${query}` : ""}`);
    setBooks(data);
    setPage(1);
  }

  useEffect(() => {
    fetchBooks().catch(() => {
      setBooks([]);
    });
  }, []);

  async function requestLoan(bookId: string) {
    if (!token) return;

    try {
      await apiRequest("/loans", {
        method: "POST",
        token,
        body: JSON.stringify({ bookId })
      });
      toast.success("Loan requested");
      fetchBooks().catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Loan failed";
      toast.error(message);
    }
  }

  async function requestReservation(bookId: string) {
    if (!token) return;

    try {
      await apiRequest("/reservations", {
        method: "POST",
        token,
        body: JSON.stringify({ bookId })
      });

      const localReservations = JSON.parse(localStorage.getItem(LOCAL_RESERVATIONS_KEY) ?? "[]") as Array<Record<string, string>>;
      localReservations.push({ bookId, createdAt: new Date().toISOString() });
      localStorage.setItem(LOCAL_RESERVATIONS_KEY, JSON.stringify(localReservations));

      toast.success("Reservation placed and added to the queue");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reservation failed";
      toast.error(message);
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    fetchBooks().catch(() => {
      toast.error("Could not load the catalog");
    });
  }

  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const pageItems = useMemo(() => books.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [books, page]);

  return (
    <section>
      <header className="page-header">
        <h2>Catalog</h2>
        <p>Search by title, author or category.</p>
      </header>

      <form className="inline-form" onSubmit={handleSearch}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
        <input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Author" />
        <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" />
        <button type="submit">Search</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Category</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((book) => (
              <tr key={book.id}>
                <td>{book.title}</td>
                <td>{book.author}</td>
                <td>{book.category}</td>
                <td>{book.available_copies}</td>
                <td className="row-actions">
                  <button onClick={() => requestLoan(book.id)} disabled={book.available_copies <= 0}>
                    Borrow
                  </button>
                  <button onClick={() => requestReservation(book.id)} disabled={book.available_copies > 0}>
                    Reserve
                  </button>
                </td>
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
