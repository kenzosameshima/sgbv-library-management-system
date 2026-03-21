import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          SGB
          <span>MVP Biblioteca</span>
        </Link>

        <nav className="nav-group">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "") }>
            Dashboard
          </NavLink>
          <NavLink to="/catalog" className={({ isActive }) => (isActive ? "active" : "")}>Acervo</NavLink>
          <NavLink to="/loans" className={({ isActive }) => (isActive ? "active" : "")}>Emprestimos</NavLink>
          <NavLink to="/reservations" className={({ isActive }) => (isActive ? "active" : "")}>Reservas</NavLink>
          <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>Historico</NavLink>
          {user?.role === "ADMIN" && <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "active" : "")}>Usuarios</NavLink>}
          {user?.role === "ADMIN" && <NavLink to="/admin/books" className={({ isActive }) => (isActive ? "active" : "")}>Livros</NavLink>}
          {user?.role === "ADMIN" && <NavLink to="/admin/fines" className={({ isActive }) => (isActive ? "active" : "")}>Multas</NavLink>}
          {user?.role === "ADMIN" && <NavLink to="/admin/reports" className={({ isActive }) => (isActive ? "active" : "")}>Relatorios</NavLink>}
        </nav>

        <div className="sidebar-footer">
          <p>{user?.name}</p>
          <small>{user?.role}</small>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
