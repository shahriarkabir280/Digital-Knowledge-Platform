export default function AsyncStateBlock({
  status,
  title,
  description,
  error,
  items,
  renderItem,
}) {
  if (status === 'loading') {
    return <p className="state-text">Loading data...</p>
  }

  if (status === 'error') {
    return <p className="state-text state-error">Error: {error}</p>
  }

  if (status === 'empty') {
    return <p className="state-text">No records found yet.</p>
  }

  if (status === 'success') {
    return (
      <div className="state-list-wrap">
        <h3>{title}</h3>
        <p>{description}</p>
        <ul className="state-list">
          {items.map((item) => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      </div>
    )
  }

  return <p className="state-text">Click load to fetch data state.</p>
}
