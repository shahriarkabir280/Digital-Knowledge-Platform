/**
 * PDFThumbnail
 * Renders the actual first page of a PDF as a card thumbnail using pdfjs-dist.
 *
 * Features:
 *  - IntersectionObserver lazy-loading (renders only when visible in viewport)
 *  - Module-level cache (same URL is never rendered twice per session)
 *  - Animated shimmer skeleton while loading
 *  - Graceful fallback to a static placeholder image on CORS / load errors
 *  - Auth-header support for backend API URLs
 */
import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// Use the static worker file copied to public/ during prebuild.
// This avoids Nginx MIME type issues with .mjs files in production.
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// Module-level cache: pdfUrl → data-URL (jpeg) of the first page
const thumbCache = new Map()

/** Read the stored auth token (same key used by auth-session.js) */
function getStoredToken() {
  try {
    const raw = localStorage.getItem('dkp.auth')
    return raw ? JSON.parse(raw)?.token || '' : ''
  } catch {
    return ''
  }
}

/**
 * @param {object}  props
 * @param {string}  props.pdfUrl      - Publicly accessible PDF URL
 * @param {string}  props.fallbackSrc - Static image to show when PDF can't be rendered
 * @param {string}  [props.badgeColor]    - Tailwind class for the type badge background
 * @param {string}  [props.badgeLabel]    - Label text for the type badge
 * @param {string}  [props.className]     - Extra classes on the root container
 */
export default function PDFThumbnail({
  pdfUrl,
  fallbackSrc,
  badgeColor = 'bg-red-600',
  badgeLabel = 'PDF',
  className = '',
}) {
  const rootRef = useRef(null)        // container div observed by IntersectionObserver
  const canvasRef = useRef(null)      // canvas element where the page is drawn
  const [status, setStatus] = useState('idle') // idle | loading | done | error

  useEffect(() => {
    if (!pdfUrl) {
      setStatus('error')
      return
    }

    // If already cached, paint immediately
    if (thumbCache.has(pdfUrl)) {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        ctx.drawImage(img, 0, 0)
        setStatus('done')
      }
      img.src = thumbCache.get(pdfUrl)
      return
    }

    // Lazy-render: only fire when the card scrolls into view
    let cancelled = false
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        observer.disconnect()
        renderFirstPage()
      },
      { rootMargin: '200px' } // start a bit before the card reaches the viewport
    )

    if (rootRef.current) observer.observe(rootRef.current)

    async function renderFirstPage() {
      setStatus('loading')
      try {
        // For backend API URLs, attach the auth token as an HTTP header
        const isApiUrl = /\/api\/|localhost|127\.0\.0\.1/.test(pdfUrl)
        const token = isApiUrl ? getStoredToken() : ''

        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/cmaps/',
          cMapPacked: true,
          verbosity: 0,
          ...(token ? { httpHeaders: { Authorization: `Bearer ${token}` } } : {}),
        })

        const pdf = await loadingTask.promise
        if (cancelled) return

        const page = await pdf.getPage(1)
        if (cancelled) return

        // Render at the container's exact dimensions at device-pixel ratio
        // so the thumbnail stays razor-sharp on retina displays (2×–3×).
        const canvas = canvasRef.current
        if (!canvas || cancelled) return

        const container = canvas.parentElement
        if (!container || cancelled) return
        const { width: displayWidth, height: displayHeight } = container.getBoundingClientRect()
        if (displayWidth === 0 || displayHeight === 0) return

        const dpr = window.devicePixelRatio || 1
        canvas.width  = displayWidth * dpr
        canvas.height = displayHeight * dpr

        // Scale the PDF page to fill the canvas area
        const naturalVP = page.getViewport({ scale: 1 })
        const scale = Math.max(
          (displayWidth * dpr) / naturalVP.width,
          (displayHeight * dpr) / naturalVP.height
        )
        const viewport = page.getViewport({ scale })

        // Center the page on canvas (PDF is portrait, container is landscape)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const offsetX = Math.max(0, (canvas.width  - viewport.width)  / 2)
        const offsetY = Math.max(0, (canvas.height - viewport.height) / 2)

        await page.render({
          canvasContext: ctx,
          viewport,
          offsetX,
          offsetY,
        }).promise

        if (cancelled) return

        // Cache the rendered image as a data-URL so we never render it again
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        thumbCache.set(pdfUrl, dataUrl)

        setStatus('done')
      } catch (_err) {
        // CORS, invalid PDF, network error → show fallback
        if (!cancelled) setStatus('error')
      }
    }

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [pdfUrl])

  return (
    <div
      ref={rootRef}
      className={`relative w-full h-40 overflow-hidden bg-muted ${className}`}
    >
      {/* ── Shimmer skeleton while loading ── */}
      {(status === 'idle' || status === 'loading') && (
        <div className="absolute inset-0 flex flex-col gap-2 p-3 animate-pulse">
          {/* Mimic a document page skeleton */}
          <div className="h-3 w-3/4 rounded bg-muted-foreground/10" />
          <div className="h-2 w-full rounded bg-muted-foreground/10" />
          <div className="h-2 w-5/6 rounded bg-muted-foreground/10" />
          <div className="h-2 w-full rounded bg-muted-foreground/10" />
          <div className="h-2 w-4/5 rounded bg-muted-foreground/10" />
          <div className="h-2 w-full rounded bg-muted-foreground/10" />
          <div className="h-2 w-3/4 rounded bg-muted-foreground/10" />
          <div className="mt-1 h-2 w-2/3 rounded bg-muted-foreground/10" />
        </div>
      )}

      {/* ── Rendered PDF canvas ── */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300 ${
          status === 'done' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ imageRendering: 'auto' }}
      />

      {/* ── Fallback static image on error ── */}
      {status === 'error' && (
        <img
          src={fallbackSrc}
          alt="Document preview"
          className="absolute inset-0 w-full h-full object-contain p-4"
        />
      )}

      {/* ── Hover overlay ── */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-200 flex items-center justify-center pointer-events-none">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30 pointer-events-none">
          Click to View Details
        </span>
      </div>

      {/* ── Type badge (always visible) ── */}
      <span
        className={`absolute bottom-2 left-2 ${badgeColor} text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded`}
      >
        {badgeLabel}
      </span>
    </div>
  )
}
