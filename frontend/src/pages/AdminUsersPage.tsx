import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { AuthUser, Role } from "../types";

export default function AdminUsersPage() {
  const { token } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [createdUsers, setCreatedUsers] = useState<AuthUser[]>([]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      toast.error("Senha minima: 8 caracteres");
      return;
    }

    try {
      const created = await apiRequest<AuthUser>("/users", {
        method: "POST",
        token,
        body: JSON.stringify({ name, email, password, role })
      });

      setCreatedUsers((list) => [created, ...list]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("USER");
      toast.success("Usuario criado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar usuario");
    }
  }

  return (
    <section>
      <header className="page-header">
        <h2>Gerenciar Usuarios</h2>
        <p>Criacao de usuarios para acesso ao sistema.</p>
      </header>

      <form className="panel-form" onSubmit={handleSubmit}>
        <label>
          Nome
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <label>
          Perfil
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <button type="submit">Cadastrar Usuario</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Perfil</th>
            </tr>
          </thead>
          <tbody>
            {createdUsers.map((created) => (
              <tr key={created.id}>
                <td>{created.name}</td>
                <td>{created.email}</td>
                <td>{created.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
