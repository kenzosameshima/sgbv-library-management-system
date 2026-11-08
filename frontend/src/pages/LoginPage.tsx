import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../auth/AuthContext";
import { PASSWORD_MIN_LENGTH } from "../constants";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (password.length < PASSWORD_MIN_LENGTH) {
      toast.error(`Password must have at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success("Signed in successfully");
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>SGB Library</h1>
        <p>Sign in to manage the catalog, loans and reservations.</p>

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
          Password
          <input
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`at least ${PASSWORD_MIN_LENGTH} characters`}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
