import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import CatalogPage from "./pages/CatalogPage";
import LoansPage from "./pages/LoansPage";
import ReservationsPage from "./pages/ReservationsPage";
import HistoryPage from "./pages/HistoryPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminBooksPage from "./pages/AdminBooksPage";
import AdminFinesPage from "./pages/AdminFinesPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/history" element={<HistoryPage />} />

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/books" element={<AdminBooksPage />} />
            <Route path="/admin/fines" element={<AdminFinesPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
