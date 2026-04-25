import { useMemo, useState, useRef, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min?url'
import { RESOURCE_ITEMS, REVIEW_FEED, resolveTypeIcon } from '../modules/library/data.js'
import './LibrarySection.css'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

const RESOURCE_VERSIONS = ['v1.0 Initial Upload', 'v2.1 Added diagrams', 'v3.2 Fixed citations']

const renderStars = (rating) => {
  return (
    <div className="library-rating-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= Math.round(rating) ? 'library-star-filled' : 'library-star-empty'}>
          ★
        </span>
      ))}
    </div>
  )
}

export default function LibraryResourceDetailsPage() {
  const { resourceId } = useParams()
  const [bookmarked, setBookmarked] = useState(false)
  const [numPages, setNumPages] = useState(null)
  const [scale, setScale] = useState(1.0)
  const [userComment, setUserComment] = useState('')
  const [userRating, setUserRating] = useState(5)
  const [containerWidth, setContainerWidth] = useState(null)
  const viewportRef = useRef(null)

  const handleFitWidth = () => {
    if (viewportRef.current) {
      const width = viewportRef.current.clientWidth - 40
      setContainerWidth(width)
      setScale(1.0)
    }
  }

  useEffect(() => {
    handleFitWidth()
    window.addEventListener('resize', handleFitWidth)
    return () => window.removeEventListener('resize', handleFitWidth)
  }, [])

  const resource = useMemo(() => {
    return RESOURCE_ITEMS.find((item) => item.id === resourceId) || RESOURCE_ITEMS[0]
  }, [resourceId])

  const hasPdf = Boolean(resource.pdfUrl) && resource.type !== 'Video'
  const hasVideo = Boolean(resource.youtubeId)
  const pdfFile = useMemo(() => ({ url: resource.pdfUrl }), [resource.pdfUrl])

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Resource Details</p>
        <h2 className="library-details-title">{resource.title}</h2>
        <p className="library-details-meta">
          Uploaded by {resource.author} · {resource.department} · {resource.course} · Last updated{' '}
          {new Date(resource.updatedAt).toLocaleDateString()}
        </p>
      </header>

      <div className="library-resource-layout">
        <main className="library-details-content">
          <section className="library-preview-pane">
            <h3 className="library-section-title">Inline Preview</h3>
            <p className="library-preview-meta">
              File Type: {resolveTypeIcon(resource.type)} · Access: {resource.access}
            </p>
            
            <div className="library-preview-box">
              {resource.githubUrl && (
                <div className="library-project-links" style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                  <a 
                    href={resource.githubUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="library-btn-tech library-btn-repo"
                    style={{ flex: 'none', padding: '10px 24px' }}
                  >
                     View Source on GitHub
                  </a>
                  {resource.youtubeId && (
                    <span className="library-tech-badge" style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                      Project Demo Included
                    </span>
                  )}
                </div>
              )}
              
              {hasVideo && (
                <div className="library-video-container" style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: resource.readme || hasPdf ? '32px' : '0' }}>
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${resource.youtubeId}?autoplay=1&mute=0&rel=0`}
                    title={resource.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}

              {resource.readme && (
                <div className="library-readme-container" style={{ marginBottom: hasPdf ? '32px' : '0' }}>
                  <div className="library-readme-header">
                    <span>README.md</span>
                    <button className="library-btn-tech library-btn-demo" style={{ padding: '4px 12px', fontSize: '0.7rem' }}>Copy Raw</button>
                  </div>
                  <div className="library-readme-body">
                    {resource.readme.split('\n').map((line, idx) => {
                      if (line.startsWith('# ')) return <h1 key={idx}>{line.substring(2)}</h1>
                      if (line.startsWith('## ')) return <h2 key={idx}>{line.substring(3)}</h2>
                      if (line.startsWith('### ')) return <h3 key={idx}>{line.substring(4)}</h3>
                      if (line.startsWith('- ')) return <li key={idx} style={{ marginLeft: '20px' }}>{line.substring(2)}</li>
                      if (line.startsWith('```')) return null
                      if (line.trim() === '') return <br key={idx} />
                      return <p key={idx}>{line}</p>
                    })}
                  </div>
                </div>
              )}

              {hasPdf && (
                <div className="library-pdf-reader">
                  {numPages && (
                    <div className="library-pdf-controls" style={{ justifyContent: 'center', gap: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          className="library-btn library-btn-ghost" 
                          onClick={() => setScale(s => Math.max(s - 0.1, 0.4))}
                          style={{ padding: '2px 8px', fontSize: '1.1rem' }}
                        >
                          −
                        </button>
                        <span style={{ fontSize: '0.9rem', color: '#355064', fontWeight: '700', minWidth: '48px', textAlign: 'center' }}>
                          {Math.round(scale * 100)}%
                        </span>
                        <button 
                          className="library-btn library-btn-ghost" 
                          onClick={() => setScale(s => Math.min(s + 0.1, 3.0))}
                          style={{ padding: '2px 8px', fontSize: '1.1rem' }}
                        >
                          +
                        </button>
                      </div>
                      <button 
                        className="library-btn library-btn-ghost" 
                        onClick={handleFitWidth}
                        style={{ fontSize: '0.75rem', fontWeight: '600' }}
                      >
                        Fit Width
                      </button>
                    </div>
                  )}

                  <div className="library-pdf-viewport" ref={viewportRef}>
                    <Document
                      file={pdfFile}
                      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                      loading={<div className="library-pdf-loading" style={{ textAlign: 'center' }}>Initializing document...</div>}
                    >
                      {Array.from(new Array(numPages || 0), (el, index) => (
                        <div key={`page_${index + 1}`} className="library-pdf-page-wrapper">
                          <Page 
                            pageNumber={index + 1} 
                            scale={scale} 
                            width={containerWidth}
                            renderTextLayer={false} 
                            renderAnnotationLayer={false} 
                          />
                        </div>
                      ))}
                    </Document>
                  </div>
                </div>
              )}

              {!hasPdf && !hasVideo && !resource.readme && (
                <div className="library-panel" style={{ textAlign: 'center', padding: '40px' }}>
                  <p>Preview not available for this resource type.</p>
                </div>
              )}
            </div>

            <div className="library-card-actions">
              <a
                href={resource.pdfUrl || '#'}
                className="library-btn library-btn-primary"
                target="_blank"
                rel="noreferrer"
                aria-disabled={!hasPdf}
              >
                Download
              </a>
              <button type="button" className="library-btn library-btn-ghost" onClick={() => setBookmarked((current) => !current)}>
                {bookmarked ? 'Saved to Favorites' : 'Add to Favorites'}
              </button>
            </div>
          </section>

          <section className="library-panel">
            <h3 className="library-section-title">Leave a Review</h3>
            <div className="library-mt-8" style={{ display: 'grid', gap: '12px' }}>
              <div className="library-form-field">
                <label>Your Rating</label>
                <div className="library-star-picker">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="library-star-button"
                      onClick={() => setUserRating(star)}
                      aria-label={`${star} Stars`}
                    >
                      <span className={star <= userRating ? 'library-star-filled' : 'library-star-empty'}>
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="library-form-field">
                <label>Comment</label>
                <textarea 
                  className="library-textarea" 
                  placeholder="Write your feedback here..."
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                />
              </div>
              <button 
                type="button" 
                className="library-btn library-btn-primary"
                onClick={() => {
                  alert('Thank you for your review!')
                  setUserComment('')
                }}
              >
                Submit Review
              </button>
            </div>
          </section>
        </main>

        <aside className="library-side-stack">
          <section className="library-suggestion">
            <h4 className="library-suggestion-title">Metadata</h4>
            <ul className="library-mini-list">
              <li>Department: {resource.department}</li>
              <li>Year: {resource.year}</li>
              <li>Type: {resource.type}</li>
              <li>Access: {resource.access}</li>
              <li>Version: {resource.version}</li>
            </ul>
          </section>

          <section className="library-suggestion">
            <h4 className="library-suggestion-title">Version Control</h4>
            <ul className="library-version-list">
              {RESOURCE_VERSIONS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="library-suggestion">
            <h4 className="library-suggestion-title">Ratings and Reviews</h4>
            <div className="library-rating-summary">
              <div className="library-rating-value">{resource.rating}</div>
              {renderStars(resource.rating)}
              <div className="library-rating-count">{resource.reviews} reviews</div>
            </div>
            <ul className="library-review-list library-mt-8">
              {REVIEW_FEED.map((review) => (
                <li key={review.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{review.user}</strong>
                    {renderStars(review.rating)}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#475569' }}>{review.comment}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="library-suggestion">
            <h4 className="library-suggestion-title">Quick Actions</h4>
            <Link to="/library" className="library-btn library-btn-ghost library-btn-block">
              Back to Library
            </Link>
            <Link to="/library/upload" className="library-btn library-btn-primary library-btn-block library-mt-8">
              Upload New Version
            </Link>
          </section>
        </aside>
      </div>
    </section>
  )
}
