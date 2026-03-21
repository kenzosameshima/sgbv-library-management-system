export default function StatCard({
  title,
  value,
  helper
}: {
  title: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <article className="stat-card">
      <h3>{title}</h3>
      <p>{value}</p>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}
