import { useEffect, useRef, useState } from 'react'

/**
 * JitsiRoom — embeds a Jitsi Meet video call inside a reading room.
 *
 * Loads Jitsi's official external_api.js from the public meet.jit.si server
 * on demand (no npm dependency, no API key, no backend signaling). Every
 * reading room maps to a unique, hard-to-guess Jitsi room name so separate
 * study groups never collide.
 *
 * Props:
 *   roomId       — reading_rooms.id (used to derive the Jitsi room name)
 *   roomName     — human-readable room name (subject shown in the call)
 *   displayName  — current user's name, prefilled in the call
 *   onClose      — called when the user ends the call
 */

const JITSI_DOMAIN = 'meet.jit.si'
const JITSI_SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`

// Load the external API script once and reuse it across mounts.
let scriptPromise = null
function loadJitsiScript() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = JITSI_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Failed to load the Jitsi video library'))
    }
    document.body.appendChild(script)
  })
  return scriptPromise
}

export default function JitsiRoom({ roomId, roomName, displayName, onClose }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('')

  // Keep the latest onClose/displayName without making them effect dependencies.
  // The parent (ViewerPage) re-renders every few seconds (presence polling) and
  // passes a fresh onClose closure each time; if the effect depended on it, the
  // call would tear down and rebuild on every poll (the "flicker" loop).
  const onCloseRef = useRef(onClose)
  const displayNameRef = useRef(displayName)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => { displayNameRef.current = displayName }, [displayName])

  useEffect(() => {
    let cancelled = false

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current) return

        // Namespace the room so it's unique to this deployment + reading room.
        const jitsiRoomName = `DKP-ReadingRoom-${roomId}`

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: jitsiRoomName,
          parentNode: containerRef.current,
          userInfo: { displayName: displayNameRef.current || 'Reader' },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: true,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            DEFAULT_BACKGROUND: '#1a1a1a',
          },
        })

        apiRef.current = api
        api.addEventListener('videoConferenceLeft', () => {
          if (onCloseRef.current) onCloseRef.current()
        })
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMsg(err.message || 'Could not start video call')
        setStatus('error')
      })

    return () => {
      cancelled = true
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
  }, [roomId])

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-4">
        <p className="text-xs text-red-500">{errorMsg}</p>
        <button
          onClick={onClose}
          className="text-[11px] underline text-muted-foreground hover:text-foreground"
        >
          Close video
        </button>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
          Connecting to “{roomName}” video…
        </div>
      )}
      <div ref={containerRef} className="w-full h-full [&_iframe]:rounded-lg" />
    </div>
  )
}
