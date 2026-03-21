import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Book } from "../types";

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
      toast.success("Emprestimo solicitado");
      fetchBooks().catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no emprestimo";
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

      const localReservations = JSON.parse(localStorage.getItem("sgb_reservations") ?? "[]") as Array<Record<string, string>>;
      localReservations.push({ bookId, createdAt: new Date().toISOString() });
      localStorage.setItem("sgb_reservations", JSON.stringify(localReservations));

      toast.success("Reserva realizada e adicionada na fila");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao reservar";
      toast.error(message);
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    fetchBooks().catch(() => {
      toast.error("Nao foi possivel consultar o acervo");
    });
  }

  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const pageItems = useMemo(() => books.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [books, page]);

  return (
    <section>
      <header className="page-header">
        <h2>Acervo</h2>
        <p>Busque por titulo, autor ou categoria.</p>
      </header>

      <form className="inline-form" onSubmit={handleSearch}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titulo" />
        <input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Autor" />
        <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Categoria" />
        <button type="submit">Pesquisar</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Titulo</th>
              <th>Autor</th>
              <th>Categoria</th>
              <th>Disponiveis</th>
              <th>Acoes</th>
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
                    Emprestar
                  </button>
                  <button onClick={() => requestReservation(book.id)} disabled={book.available_copies > 0}>
                    Reservar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</button>
        <span>
          Pagina {page} de {totalPages}
        </span>
        <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Proxima</button>
      </div>
    </section>
  );
}
