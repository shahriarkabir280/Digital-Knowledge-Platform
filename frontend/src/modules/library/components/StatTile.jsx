export default function StatTile({ label, value, delta }) {
  return (
    <article className="library-stat-tile" role="listitem">
      <p className="library-stat-label">{label}</p>
      <p className="library-stat-value">{value}</p>
      <p className="library-stat-delta">{delta}</p>
    </article>
  )
}
