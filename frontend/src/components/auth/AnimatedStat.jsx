import { useEffect, useState } from 'react'

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frame
    const start = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}

/**
 * Counts up from 0 to the numeric portion of `value` (e.g. "12,490+", "84K+"),
 * preserving whatever non-numeric suffix follows the digits.
 */
export default function AnimatedStat({ value, delay = 0, duration = 1200 }) {
  const match = String(value).match(/^([\d,]+)(.*)$/)
  const numeric = match ? Number(match[1].replace(/,/g, '')) : null
  const suffix = match ? match[2] : ''

  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const count = useCountUp(started && numeric != null ? numeric : 0, duration)

  if (numeric == null) {
    return value
  }

  return `${count.toLocaleString()}${suffix}`
}
