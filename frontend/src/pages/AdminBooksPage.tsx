import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Modal from "../components/Modal";
import type { Book } from "../types";

const PAGE_SIZE = 6;

interface BookPayload {
  title: string;
  author: string;
  category: string;
  isbn: string;
  totalCopies: number;
}

const emptyBook: BookPayload = {
  title: "",
  author: "",
  category: "",
  isbn: "",
  totalCopies: 1
};

export default function AdminBooksPage() {
  const { token } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form, setForm] = useState<BookPayload>(emptyBook);

  async function loadBooks() {
    const data = await apiRequest<Book[]>("/books");
    setBooks(data);
  }

  useEffect(() => {
    loadBooks().catch(() => setBooks([]));
  }, []);

  function openCreateModal() {
    setEditingBook(null);
    setForm(emptyBook);
    setOpen(true);
  }

  function openEditModal(book: Book) {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      totalCopies: book.total_copies
    });
    setOpen(true);
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    try {
      if (editingBook) {
        await apiRequest(`/books/${editingBook.id}`, {
          method: "PUT",
          token,
          body: JSON.stringify(form)
        });
        toast.success("Livro atualizado");
      } else {
        await apiRequest("/books", {
          method: "POST",
          token,
          body: JSON.stringify(form)
        });
        toast.success("Livro cadastrado");
      }

      setOpen(false);
      loadBooks().catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar livro");
    }
  }

  async function removeBook(id: string) {
    if (!token) return;

    try {
      await apiRequest(`/books/${id}`, {
        method: "DELETE",
        token
      });
      toast.success("Livro removido");
      loadBooks().catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover livro");
    }
  }

  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const pageItems = useMemo(() => books.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [books, page]);

  return (
    <section>
      <header className="page-header with-action">
        <div>
          <h2>Gerenciar Livros</h2>
          <p>Cadastro, edicao e remocao do acervo.</p>
        </div>
        <button onClick={openCreateModal}>Novo Livro</button>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Titulo</th>
              <th>Autor</th>
              <th>Categoria</th>
              <th>ISBN</th>
              <th>Total</th>
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
                <td>{book.isbn}</td>
                <td>{book.total_copies}</td>
                <td>{book.available_copies}</td>
                <td className="row-actions">
                  <button onClick={() => openEditModal(book)}>Editar</button>
                  <button onClick={() => removeBook(book.id)}>Remover</button>
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

      <Modal title={editingBook ? "Editar Livro" : "Novo Livro"} open={open} onClose={() => setOpen(false)}>
        <form className="panel-form" onSubmit={submitForm}>
          <label>
            Titulo
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label>
            Autor
            <input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} required />
          </label>
          <label>
            Categoria
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required />
          </label>
          <label>
            ISBN
            <input value={form.isbn} onChange={(event) => setForm({ ...form, isbn: event.target.value })} required />
          </label>
          <label>
            Total de Copias
            <input
              type="number"
              min={1}
              value={form.totalCopies}
              onChange={(event) => setForm({ ...form, totalCopies: Number(event.target.value) })}
              required
            />
          </label>
          <button type="submit">Salvar</button>
        </form>
      </Modal>
    </section>
  );
}
