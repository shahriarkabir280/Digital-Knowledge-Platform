import { motion } from 'framer-motion'

const ORBS = [
  { top: '8%', left: '10%', size: 190, color: 'var(--brand-300)', duration: 34 },
  { top: '68%', left: '6%', size: 150, color: '#f0abfc', duration: 40 },
  { top: '14%', left: '88%', size: 170, color: '#fbbf24', duration: 37 },
  { top: '78%', left: '86%', size: 210, color: 'var(--brand-400)', duration: 44 },
]

/**
 * Soft, slow-drifting bokeh light — pure ambience for the form panel so the
 * whitespace around the card feels gently lit rather than flat and empty.
 * Deliberately calm (long, subtle loops) rather than lively; skipped under
 * reduced-motion.
 */
export default function AmbientGlow() {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {ORBS.map(({ top, left, size, color, duration }, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full"
          style={{
            top,
            left,
            width: size,
            height: size,
            background: `radial-gradient(circle, ${color} 0%, transparent 72%)`,
            opacity: .16,
            filter: 'blur(6px)',
          }}
          animate={
            prefersReducedMotion
              ? undefined
              : { x: [0, 18, -12, 0], y: [0, -20, 10, 0], opacity: [.12, .2, .12] }
          }
          transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}
