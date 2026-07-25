import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { getPasswordChecks } from '@/lib/passwordRules'

const STRENGTH_LEVELS = [
  { label: '', color: 'hsl(var(--border))' },
  { label: 'Weak', color: '#ef4444' },
  { label: 'Weak', color: '#ef4444' },
  { label: 'Fair', color: '#f59e0b' },
  { label: 'Good', color: '#84cc16' },
  { label: 'Strong', color: '#10b981' },
]

export default function PasswordStrengthMeter({ password }) {
  if (!password) {
    return null
  }

  const checks = getPasswordChecks(password)
  const score = checks.filter((check) => check.passed).length
  const strength = STRENGTH_LEVELS[score]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: .25 }}
      className="grid gap-1.5 overflow-hidden"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2, 3, 4].map((segment) => (
            <div key={segment} className="h-full flex-1 overflow-hidden rounded-full bg-[hsl(var(--border))]">
              <motion.div
                className="h-full rounded-full"
                initial={false}
                animate={{
                  width: segment < score ? '100%' : '0%',
                  backgroundColor: strength.color,
                }}
                transition={{ duration: .3, ease: 'easeOut' }}
              />
            </div>
          ))}
        </div>
        <span
          className="w-11 shrink-0 text-right text-[.7rem] font-bold"
          style={{ color: strength.color }}
        >
          {strength.label}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((check) => (
          <li key={check.key} className="flex items-center gap-1.5 text-[.72rem] font-medium text-[var(--muted)]">
            <AnimatePresence mode="wait" initial={false}>
              {check.passed ? (
                <motion.span
                  key="pass"
                  initial={{ scale: .4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: .4, opacity: 0 }}
                  transition={{ duration: .18 }}
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                >
                  <Check size={9} strokeWidth={3.5} />
                </motion.span>
              ) : (
                <motion.span
                  key="fail"
                  initial={{ scale: .4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: .4, opacity: 0 }}
                  transition={{ duration: .18 }}
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                >
                  <X size={9} strokeWidth={3.5} />
                </motion.span>
              )}
            </AnimatePresence>
            <span className={check.passed ? 'text-[var(--ink)]' : ''}>{check.label}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
