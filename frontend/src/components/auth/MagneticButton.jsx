import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

/**
 * Wraps a button-like child and makes it "magnetically" drift toward the
 * cursor when hovered nearby, springing back to rest on leave.
 */
export default function MagneticButton({ children, strength = .35, className, style, ...motionProps }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 250, damping: 18, mass: .3 })
  const springY = useSpring(y, { stiffness: 250, damping: 18, mass: .3 })

  const handleMouseMove = (event) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY, ...style }}
      whileTap={{ scale: .96 }}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
}
