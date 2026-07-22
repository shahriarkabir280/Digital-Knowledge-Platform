import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import cseduLogo from '@/assets/CSEDULOGO.png'
import ParticleField from './ParticleField.jsx'
import AmbientGlow from './AmbientGlow.jsx'
import './AuthLayout.css'

const textVariants = {
  hidden: { opacity: 0, y: 14 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: .55, delay, ease: [0.22, 1, 0.36, 1] },
  }),
}

/**
 * Shared split-screen shell for Login/Register: animated aurora + cursor
 * spotlight branding panel on the left (hidden on small screens), glass
 * form card on the right.
 */
export default function AuthLayout({ eyebrow, title, description, panelExtra, children }) {
  const panelRef = useRef(null)

  // Cursor-follow spotlight + custom cursor ring: write CSS custom
  // properties directly to the DOM node instead of React state, so pointer
  // movement never triggers a re-render.
  const handlePointerMove = (event) => {
    const node = panelRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const xPct = ((event.clientX - rect.left) / rect.width) * 100
    const yPct = ((event.clientY - rect.top) / rect.height) * 100
    node.style.setProperty('--spot-x', `${xPct}%`)
    node.style.setProperty('--spot-y', `${yPct}%`)
    node.style.setProperty('--spot-opacity', '1')
    node.style.setProperty('--cursor-x', `${event.clientX - rect.left}px`)
    node.style.setProperty('--cursor-y', `${event.clientY - rect.top}px`)
    node.style.setProperty('--cursor-opacity', '1')
    node.classList.toggle('cursor-hover-active', Boolean(event.target.closest('[data-cursor-hover]')))
  }

  const handlePointerLeave = () => {
    const node = panelRef.current
    if (!node) return
    node.style.setProperty('--spot-opacity', '0')
    node.style.setProperty('--cursor-opacity', '0')
    node.classList.remove('cursor-hover-active')
  }

  // Softer spotlight for the light form panel — no custom cursor here, the
  // native pointer stays put so typing/clicking in the form is unaffected.
  const formPanelRef = useRef(null)
  const handleFormPointerMove = (event) => {
    const node = formPanelRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const xPct = ((event.clientX - rect.left) / rect.width) * 100
    const yPct = ((event.clientY - rect.top) / rect.height) * 100
    node.style.setProperty('--form-spot-x', `${xPct}%`)
    node.style.setProperty('--form-spot-y', `${yPct}%`)
    node.style.setProperty('--form-spot-opacity', '1')
  }
  const handleFormPointerLeave = () => {
    formPanelRef.current?.style.setProperty('--form-spot-opacity', '0')
  }

  return (
    <div className="auth-shell grid min-h-[100svh] lg:grid-cols-2">
      {/* Left panel — branding */}
      <div
        ref={panelRef}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        className="auth-panel hidden flex-col items-center justify-center gap-8 bg-gradient-to-br from-[var(--brand-700)] via-[var(--brand-500)] to-[var(--brand-400)] p-12 text-white lg:flex"
      >
        <span className="auth-blob auth-blob-a" aria-hidden="true" />
        <span className="auth-blob auth-blob-b" aria-hidden="true" />
        <span className="auth-blob auth-blob-c" aria-hidden="true" />
        <span className="auth-blob auth-blob-d" aria-hidden="true" />
        <span className="auth-blob auth-blob-e" aria-hidden="true" />
        <ParticleField />
        <span className="auth-cursor-ring" aria-hidden="true" />

        <div className="relative z-10 grid gap-5 text-center">
          <motion.img
            src={cseduLogo}
            alt="CSEDU Logo"
            data-cursor-hover
            className="mx-auto h-24 w-24 rounded-2xl border-[3px] border-white/25 object-cover shadow-lg"
            initial={{ opacity: 0, scale: .7, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: .6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.08, rotate: 4 }}
          />
          <div>
            <motion.p
              custom={.1}
              variants={textVariants}
              initial="hidden"
              animate="show"
              className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-white/75"
            >
              {eyebrow}
            </motion.p>
            <motion.h1
              custom={.2}
              variants={textVariants}
              initial="hidden"
              animate="show"
              className="auth-gradient-text mb-3 text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold leading-[1.1] tracking-tight"
            >
              {title}
            </motion.h1>
            <motion.p
              custom={.3}
              variants={textVariants}
              initial="hidden"
              animate="show"
              className="mx-auto max-w-[32ch] text-[.95rem] leading-relaxed text-white/80"
            >
              {description}
            </motion.p>
          </div>
        </div>

        <motion.div
          custom={.4}
          variants={textVariants}
          initial="hidden"
          animate="show"
          className="relative z-10"
        >
          {panelExtra}
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div
        ref={formPanelRef}
        onMouseMove={handleFormPointerMove}
        onMouseLeave={handleFormPointerLeave}
        className="auth-form-panel flex flex-col items-center justify-center gap-5 overflow-y-auto p-8 sm:p-12"
      >
        <span className="auth-form-blob auth-form-blob-a" aria-hidden="true" />
        <span className="auth-form-blob auth-form-blob-b" aria-hidden="true" />
        <span className="auth-form-blob auth-form-blob-c" aria-hidden="true" />
        <AmbientGlow />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .5, ease: [0.22, 1, 0.36, 1] }}
          className="auth-card grid w-full max-w-[400px] gap-6 rounded-2xl p-7 sm:p-8"
        >
          {children}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .5, delay: .5, ease: [0.22, 1, 0.36, 1] }}
          className="auth-badge flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]"
        >
          <ShieldCheck size={13} className="text-[var(--accent)]" />
          Secured institutional access for CSEDU students, faculty &amp; staff
        </motion.div>
      </div>
    </div>
  )
}
