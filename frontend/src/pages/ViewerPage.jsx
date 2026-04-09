import { useParams } from 'react-router-dom'

export default function ViewerPage() {
  const { docId } = useParams()

  return (
    <section className="page-block">
      <p className="brand-kicker">Viewer</p>
      <h2>Document Viewer</h2>
      <p>
        Placeholder for PDF/document rendering UI. Selected document id:{' '}
        <strong>{docId || 'none'}</strong>
      </p>
      <div className="viewer-placeholder">
        Viewer canvas area (toolbar + page thumbnails + content pane) will be
        implemented in the next phase.
      </div>
    </section>
  )
}
