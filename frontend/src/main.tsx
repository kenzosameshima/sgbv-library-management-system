import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./auth/AuthContext";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <ToastContainer position="top-right" autoClose={2500} closeOnClick />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
