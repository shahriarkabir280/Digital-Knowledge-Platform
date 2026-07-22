import { useEffect, useRef } from 'react'

const COLORS = ['255,255,255', '190,240,245', '125,211,252']

/**
 * Lightweight canvas particle constellation — drifting nodes that connect
 * with fading lines when close, and gently scatter away from the cursor.
 * Pure canvas/rAF, no dependency; skipped entirely under reduced-motion.
 */
export default function ParticleField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = canvas.getContext('2d')
    const parent = canvas.parentElement
    let width = 0
    let height = 0
    let particles = []
    let mouse = { x: -9999, y: -9999 }
    let frameId

    const DENSITY = 1 / 9000
    const MAX_PARTICLES = 70
    const LINK_DISTANCE = 130
    const MOUSE_RADIUS = 110

    function createParticles() {
      const count = Math.min(MAX_PARTICLES, Math.floor(width * height * DENSITY))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .25,
        vy: (Math.random() - .5) * .25,
        r: Math.random() * 1.6 + .8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }))
    }

    function resize() {
      width = parent.clientWidth
      height = parent.clientHeight
      canvas.width = width * devicePixelRatio
      canvas.height = height * devicePixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      createParticles()
    }

    function step() {
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.hypot(dx, dy)
        if (dist < MOUSE_RADIUS) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS
          p.x += (dx / (dist || 1)) * force * 1.6
          p.y += (dy / (dist || 1)) * force * 1.6
        }

        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
        p.x = Math.max(0, Math.min(width, p.x))
        p.y = Math.max(0, Math.min(height, p.y))
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < LINK_DISTANCE) {
            ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / LINK_DISTANCE) * .35})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color},.85)`
        ctx.fill()
      }

      frameId = requestAnimationFrame(step)
    }

    const handleMouseMove = (event) => {
      const rect = parent.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
    }
    const handleMouseLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(parent)
    resize()
    frameId = requestAnimationFrame(step)

    parent.addEventListener('mousemove', handleMouseMove)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      parent.removeEventListener('mousemove', handleMouseMove)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1]"
    />
  )
}
