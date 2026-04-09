import { useState } from 'react'
import { AsyncStateBlock } from '../components/common/index.js'
import { loadRepositoryItems } from '../modules/repository/index.js'

export default function RepositoryPage() {
  const [status, setStatus] = useState('idle')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const onLoad = async () => {
    try {
      setStatus('loading')
      setError('')
      const result = await loadRepositoryItems()
      setItems(result)
      setStatus(result.length ? 'success' : 'empty')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Request failed')
    }
  }

  return (
    <section className="page-block">
      <p className="brand-kicker">Repository</p>
      <h2>Repository Index</h2>
      <p>API-ready listing skeleton for repository records.</p>
      <button type="button" className="ghost-btn" onClick={onLoad}>
        Load Repository Data
      </button>
      <AsyncStateBlock
        status={status}
        title="Repository Records"
        description="These are placeholder rows until backend integration is connected."
        items={items}
        error={error}
        renderItem={(item) => (
          <span>
            <strong>{item.title}</strong> ({item.type})
          </span>
        )}
      />
    </section>
  )
}
