/**
 * BarcodeScanner Component
 * Camera-based barcode and QR code scanner using html5-qrcode.
 * Staff can scan a physical item barcode to auto-fill catalog lookups.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScanLine, Camera, CameraOff, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'

/**
 * @param {Object} props
 * @param {function(string): void} props.onResult — called with the decoded barcode/QR string
 * @param {boolean} props.active — whether the scanner should be open
 * @param {function(): void} props.onClose — called when the scanner is dismissed
 */
export default function BarcodeScanner({ onResult, active, onClose }) {
  const scannerRef = useRef(null)
  const containerRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | loading | scanning | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [lastResult, setLastResult] = useState('')
  const html5QrRef = useRef(null)

  const stopScanner = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        const state = html5QrRef.current.getState?.()
        // State 2 = SCANNING
        if (state === 2) {
          await html5QrRef.current.stop()
        }
        html5QrRef.current.clear()
      } catch {
        // Ignore errors on cleanup
      }
      html5QrRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!active) {
      stopScanner()
      setStatus('idle')
      setLastResult('')
      setErrorMsg('')
      return
    }

    let cancelled = false

    async function startScanner() {
      setStatus('loading')
      setErrorMsg('')

      try {
        // Dynamically import html5-qrcode to avoid SSR issues
        const { Html5Qrcode } = await import('html5-qrcode')

        if (cancelled) return

        const scannerId = 'barcode-scanner-region'
        const scanner = new Html5Qrcode(scannerId)
        html5QrRef.current = scanner

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
          supportedScanTypes: [
            0, // QR_CODE
            1, // EAN_13
            2, // EAN_8
            3, // UPC_A
            4, // UPC_E
            5, // CODE_128
            6, // CODE_39
            7, // CODE_93
            8, // CODABAR
            9, // ITF
          ],
        }

        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (cancelled) return
            setLastResult(decodedText)
            setStatus('success')
            onResult?.(decodedText)
          },
          () => {
            // QR scan error (no code found in frame) — silent
          }
        )

        if (!cancelled) {
          setStatus('scanning')
        }
      } catch (err) {
        if (cancelled) return
        console.error('[BarcodeScanner] Failed to start:', err)

        let msg = 'Camera access failed.'
        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
          msg = 'Camera permission denied. Please allow camera access in your browser settings.'
        } else if (err?.name === 'NotFoundError' || err?.message?.includes('not found')) {
          msg = 'No camera found on this device.'
        } else if (err?.message) {
          msg = err.message
        }

        setErrorMsg(msg)
        setStatus('error')
      }
    }

    startScanner()

    return () => {
      cancelled = true
      stopScanner()
    }
  }, [active, onResult, stopScanner])

  const handleClose = () => {
    stopScanner()
    setStatus('idle')
    setLastResult('')
    setErrorMsg('')
    onClose?.()
  }

  if (!active) return null

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <ScanLine size={14} className="text-accent" />
          Barcode / QR Scanner
          {status === 'scanning' && (
            <Badge className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border py-0">
              Live
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close scanner"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scanner viewport */}
      <div className="relative bg-black">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-white text-xs z-10 bg-black/80">
            <Loader2 size={18} className="animate-spin" />
            Starting camera…
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 px-5 bg-card text-center">
            <CameraOff size={28} className="text-muted-foreground/50" />
            <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 max-w-xs">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {errorMsg}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 gap-1.5"
              onClick={() => {
                setStatus('idle')
                setErrorMsg('')
              }}
            >
              <Camera size={12} /> Retry
            </Button>
          </div>
        )}

        {/* The html5-qrcode library mounts the video element here */}
        <div
          id="barcode-scanner-region"
          ref={containerRef}
          className={status === 'error' ? 'hidden' : 'w-full'}
          style={{ minHeight: status === 'loading' ? 200 : undefined }}
        />
      </div>

      {/* Result / instruction footer */}
      <div className="px-4 py-2.5 border-t border-border">
        {status === 'success' && lastResult ? (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 size={13} />
            Scanned: <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{lastResult}</span>
          </div>
        ) : status === 'scanning' ? (
          <p className="text-[11px] text-muted-foreground">
            Point the camera at an item's barcode or QR code. Hold steady.
          </p>
        ) : status === 'loading' ? (
          <p className="text-[11px] text-muted-foreground">Requesting camera permission…</p>
        ) : null}
      </div>
    </div>
  )
}
