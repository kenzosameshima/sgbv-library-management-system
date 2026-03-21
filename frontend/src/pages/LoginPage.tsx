import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("A senha deve ter no minimo 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success("Login realizado com sucesso");
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao autenticar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>SGB Biblioteca</h1>
        <p>Acesse para gerenciar acervo, emprestimos e reservas.</p>

        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="leitor@biblioteca.com"
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="minimo 8 caracteres"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
