import { useState } from 'react'
import { CATALOG_ITEMS } from '../modules/library/librarian-data.js'
import './LibrarySection.css'
import './LibraryLibrarian.css'

const emptyForm = {
  title: '',
  author: '',
  isbn: '',
  subject: '',
  location: '',
  availability: 'available',
  format: 'Print',
}

export default function LibraryCatalogCrudPage() {
  const [items, setItems] = useState(CATALOG_ITEMS)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  const onEdit = (item) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      author: item.author,
      isbn: item.isbn,
      subject: item.subject,
      location: item.location,
      availability: item.availability,
      format: item.format,
    })
  }

  const onSave = () => {
    if (!form.title.trim()) return

    if (editingId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId ? { ...item, ...form } : item,
        ),
      )
    } else {
      setItems((current) => [
        {
          id: `bk-${Date.now()}`,
          barcode: `LIB-${Date.now()}`,
          copies: 1,
          year: new Date().getFullYear(),
          ...form,
        },
        ...current,
      ])
    }

    setEditingId(null)
    setForm(emptyForm)
  }

  const onDelete = (id) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Librarian CRUD</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Manage catalog entries
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Create, update, and delete catalog records with audit-ready details.
        </p>
      </header>

      <section className="library-panel" style={{ display: 'grid', gap: '12px' }}>
        <h3 className="library-panel-title">Catalog editor</h3>
        <div className="librarian-form-grid">
          {[
            { id: 'title', label: 'Title' },
            { id: 'author', label: 'Author' },
            { id: 'isbn', label: 'ISBN' },
            { id: 'subject', label: 'Subject' },
            { id: 'location', label: 'Location' },
          ].map((field) => (
            <input
              key={field.id}
              className="library-input"
              placeholder={field.label}
              value={form[field.id]}
              onChange={(event) => setForm((current) => ({ ...current, [field.id]: event.target.value }))}
            />
          ))}
          <select
            className="library-select"
            value={form.availability}
            onChange={(event) => setForm((current) => ({ ...current, availability: event.target.value }))}
          >
            <option value="available">available</option>
            <option value="checked-out">checked-out</option>
            <option value="on-hold">on-hold</option>
          </select>
          <select
            className="library-select"
            value={form.format}
            onChange={(event) => setForm((current) => ({ ...current, format: event.target.value }))}
          >
            <option value="Print">Print</option>
            <option value="E-Book">E-Book</option>
            <option value="Media">Media</option>
          </select>
        </div>
        <div className="librarian-actions">
          <button type="button" className="library-btn library-btn-primary" onClick={onSave}>
            {editingId ? 'Update entry' : 'Create entry'}
          </button>
          <button type="button" className="library-btn library-btn-ghost" onClick={() => { setEditingId(null); setForm(emptyForm) }}>
            Clear
          </button>
        </div>
      </section>

      <section className="library-panel">
        <table className="librarian-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>ISBN</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.author}</td>
                <td>{item.isbn}</td>
                <td>{item.location}</td>
                <td>
                  <span className={`librarian-pill is-${item.availability}`}>
                    {item.availability}
                  </span>
                </td>
                <td>
                  <div className="librarian-actions">
                    <button type="button" className="library-btn library-btn-ghost" onClick={() => onEdit(item)}>
                      Edit
                    </button>
                    <button type="button" className="library-btn library-btn-ghost" onClick={() => onDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}
