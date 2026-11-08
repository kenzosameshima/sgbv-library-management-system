import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="not-found">
      <h2>Page not found</h2>
      <p>Go back to the dashboard and carry on.</p>
      <Link to="/">Go to Dashboard</Link>
    </section>
  );
}
