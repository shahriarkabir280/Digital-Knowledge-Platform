import { useEffect, useRef, useState } from 'react'
import './LibrarySection.css'
import './LibraryLibrarian.css'

const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window

export default function LibraryScanPage() {
  const [mode, setMode] = useState('hardware')
  const [isScanning, setIsScanning] = useState(false)
  const [lastScan, setLastScan] = useState('')
  const [scanError, setScanError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)

  useEffect(() => {
    if (mode !== 'camera' || !isScanning) return undefined

    let rafId = 0
    const startCamera = async () => {
      setScanError('')
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setScanError('Camera access is not available in this browser.')
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] })

        const scanFrame = async () => {
          if (!videoRef.current || !detectorRef.current) return
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current)
            if (barcodes.length > 0) {
              setLastScan(barcodes[0].rawValue)
            }
          } catch (error) {
            setScanError('Unable to read from camera. Try better lighting.')
          }
          rafId = requestAnimationFrame(scanFrame)
        }
        rafId = requestAnimationFrame(scanFrame)
      } catch (error) {
        setScanError('Camera access blocked. Allow permission to scan.')
      }
    }

    startCamera()

    return () => {
      cancelAnimationFrame(rafId)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      streamRef.current = null
      detectorRef.current = null
    }
  }, [mode, isScanning])

  const onHardwareScan = (event) => {
    if (event.key === 'Enter') {
      setLastScan(event.currentTarget.value)
      event.currentTarget.value = ''
    }
  }

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Barcode and QR Scan</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Scan items with hardware or camera
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Use a USB scanner (keyboard emulation) or enable the camera for QR and barcode scans.
        </p>
      </header>

      <section className="library-panel">
        <div className="librarian-inline-inputs">
          <button
            type="button"
            className={`library-btn ${mode === 'hardware' ? 'library-btn-primary' : 'library-btn-ghost'}`}
            onClick={() => setMode('hardware')}
          >
            Hardware scanner
          </button>
          <button
            type="button"
            className={`library-btn ${mode === 'camera' ? 'library-btn-primary' : 'library-btn-ghost'}`}
            onClick={() => setMode('camera')}
          >
            Camera scan
          </button>
          <span className="librarian-help">Last scan: {lastScan || 'No scans yet'}</span>
        </div>
      </section>

      {mode === 'hardware' ? (
        <section className="library-panel">
          <h3 className="library-panel-title">Hardware scanner</h3>
          <p className="librarian-help">Focus the input and scan. The scanner should send Enter after the code.</p>
          <input
            className="library-input"
            placeholder="Scan barcode or QR code"
            onKeyDown={onHardwareScan}
          />
        </section>
      ) : (
        <section className="library-panel" style={{ display: 'grid', gap: '12px' }}>
          <h3 className="library-panel-title">Camera scan</h3>
          {!hasBarcodeDetector ? (
            <p className="librarian-help">
              BarcodeDetector is not supported in this browser. Use a hardware scanner or enable Chrome.
            </p>
          ) : (
            <>
              <div className="librarian-inline-inputs">
                <button
                  type="button"
                  className="library-btn library-btn-primary"
                  onClick={() => setIsScanning((current) => !current)}
                >
                  {isScanning ? 'Stop scanning' : 'Start scanning'}
                </button>
                {scanError ? <span className="librarian-help">{scanError}</span> : null}
              </div>
              <video
                ref={videoRef}
                style={{ width: '100%', maxWidth: '480px', borderRadius: '12px', border: '1px solid #dbe6ee' }}
                muted
                playsInline
              />
            </>
          )}
        </section>
      )}
    </section>
  )
}
