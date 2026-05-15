import './UploadProgressBar.css'

export default function UploadProgressBar({ progress = 0, status = 'idle' }) {
  return (
    <div className="upload-progress-container">
      <div className="progress-bar-wrapper">
        <div
          className={`progress-bar ${status}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="progress-info">
        <span className="progress-percentage">{Math.round(progress)}%</span>
        <span className={`progress-status ${status}`}>
          {status === 'uploading' && 'Uploading...'}
          {status === 'success' && 'Complete'}
          {status === 'error' && 'Failed'}
          {status === 'idle' && 'Ready'}
        </span>
      </div>
    </div>
  )
}
