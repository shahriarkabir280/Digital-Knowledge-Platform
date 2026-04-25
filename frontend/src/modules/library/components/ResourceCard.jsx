import { Link } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min?url'
import { resolveTypeIcon } from '../data.js'

const renderStars = (rating) => {
  return (
    <div className="library-rating-stars" style={{ fontSize: '0.8rem', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= Math.round(rating) ? 'library-star-filled' : 'library-star-empty'}>
          ★
        </span>
      ))}
    </div>
  )
}

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

export default function ResourceCard({ item, onBookmarkToggle, bookmarked }) {
  const isPdf = Boolean(item.pdfUrl)

  return (
    <article className="library-card">
      <Link to={`/library/resource/${item.id}`} className="library-card-preview">
        {isPdf ? (
            <div className="library-card-preview-pdf">
            <Document
              file={{ url: item.pdfUrl }}
              loading={<div className="library-card-preview-loading">Loading preview...</div>}
              error={<div className="library-card-preview-loading">Preview unavailable</div>}
            >
                <Page pageNumber={1} width={240} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
          </div>
        ) : (
          <div className="library-card-preview-lines">
            <span />
            <span />
            <span className="is-short" />
          </div>
        )}
      </Link>

      <div className="library-card-top">
        <span className="library-card-meta">{item.year}</span>
      </div>

      <div className="library-card-headings">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3>{item.title}</h3>
          {renderStars(item.rating)}
        </div>
        <p>
          {item.author} · {item.course}
        </p>
      </div>

      <p className="library-card-summary">{item.summary}</p>

      <div className="library-chip-row">
        {item.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="library-chip">
            #{tag}
          </span>
        ))}
      </div>

      <div className="library-card-actions">
        <Link to={`/library/resource/${item.id}`} className="library-btn library-btn-primary">
          Quick Preview
        </Link>
        <button type="button" className="library-btn library-btn-ghost">
          Download
        </button>
      </div>
    </article>
  )
}
