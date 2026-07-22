import { motion } from 'framer-motion'

const COLORS = ['#1e8a96', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#ef4444']
const PIECE_COUNT = 28

/**
 * A short-lived radial burst of colorful confetti pieces, meant to fire
 * once over a card on a success state (login/registration). Renders
 * nothing when `active` is false.
 */
export default function ConfettiBurst({ active }) {
  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl" aria-hidden="true">
      {Array.from({ length: PIECE_COUNT }).map((_, index) => {
        const angle = (index / PIECE_COUNT) * Math.PI * 2 + Math.random() * .4
        const distance = 90 + Math.random() * 90
        const targetX = Math.cos(angle) * distance
        const targetY = Math.sin(angle) * distance - 40
        const color = COLORS[index % COLORS.length]
        const isCircle = index % 3 !== 0

        return (
          <motion.span
            key={index}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
            animate={{
              opacity: 0,
              x: targetX,
              y: targetY + 120,
              scale: 1,
              rotate: (Math.random() - .5) * 480,
            }}
            transition={{ duration: 1.1 + Math.random() * .5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '38%',
              width: 7,
              height: isCircle ? 7 : 10,
              borderRadius: isCircle ? '50%' : 2,
              backgroundColor: color,
            }}
          />
        )
      })}
    </div>
  )
}
