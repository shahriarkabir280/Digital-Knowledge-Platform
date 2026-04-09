import { useState } from 'react'
import { AsyncStateBlock } from '../components/common/index.js'
import { loadLibraryItems } from '../modules/library/index.js'

export default function LibraryPage() {
  const [status, setStatus] = useState('idle')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const onLoad = async () => {
    try {
      setStatus('loading')
      setError('')
      const result = await loadLibraryItems()
      setItems(result)
      setStatus(result.length ? 'success' : 'empty')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Request failed')
    }
  }

  return (
    <section className="page-block">
      <p className="brand-kicker">Library</p>
      <h2>Catalog</h2>
      <p>Prepared state handling for catalog API integration.</p>
      <button type="button" className="ghost-btn" onClick={onLoad}>
        Load Library Data
      </button>
      <AsyncStateBlock
        status={status}
        title="Library Records"
        description="Circulation status and item metadata will come from API."
        items={items}
        error={error}
        renderItem={(item) => (
          <span>
            <strong>{item.title}</strong> - {item.status}
          </span>
        )}
      />
    </section>
  )
}
