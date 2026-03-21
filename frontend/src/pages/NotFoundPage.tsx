import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="not-found">
      <h2>Pagina nao encontrada</h2>
      <p>Volte para o dashboard e continue o fluxo do sistema.</p>
      <Link to="/">Ir para Dashboard</Link>
    </section>
  );
}
