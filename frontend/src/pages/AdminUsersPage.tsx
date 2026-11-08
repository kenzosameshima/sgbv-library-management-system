import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "react-toastify";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { AuthUser, Role } from "../types";
import { PASSWORD_MIN_LENGTH } from "../constants";

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

    if (password.length < PASSWORD_MIN_LENGTH) {
      toast.error(`Minimum password length: ${PASSWORD_MIN_LENGTH} characters`);
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
      toast.success("User created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create user");
    }
  }

  return (
    <section>
      <header className="page-header">
        <h2>Manage Users</h2>
        <p>Create users who can access the system.</p>
      </header>

      <form className="panel-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" minLength={PASSWORD_MIN_LENGTH} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <label>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <button type="submit">Register User</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
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
