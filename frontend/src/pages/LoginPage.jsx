import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import AnimatedStat from '../components/auth/AnimatedStat.jsx'
import MagneticButton from '../components/auth/MagneticButton.jsx'
import ConfettiBurst from '../components/auth/ConfettiBurst.jsx'
import { defaultRouteForRole } from '../app/rbac.js'
import { useAuth } from '../app/use-auth.js'
import { loginRequest } from '../services/api/auth.js'
import { Mail, Lock, LogIn, Compass, FileText, Users, Download, Loader2, Eye, EyeOff } from 'lucide-react'

const STATS = [
  { label: 'Documents', value: '12,490+', Icon: FileText },
  { label: 'Researchers', value: '840+', Icon: Users },
  { label: 'Downloads', value: '84K+', Icon: Download },
]

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

const formStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: .08, delayChildren: .1 },
  },
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const { authState, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const registeredEmail = location.state?.registeredEmail || ''

  useEffect(() => {
    if (registeredEmail && !identifier) setIdentifier(registeredEmail)
  }, [registeredEmail, identifier])

  const from = location.state?.from?.pathname || ''

  if (authState.isAuthenticated && authState.token) {
    return <Navigate to={from || defaultRouteForRole(authState.role)} replace />
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Email and password are required.')
      return
    }
    try {
      setIsSubmitting(true)
      const session = await loginRequest({ identifier: identifier.trim(), password })
      login({ role: session.user.role, name: session.user.name, email: session.user.email, token: session.token, refreshToken: session.refreshToken, expiresAt: session.expiresAt })
      setShowConfetti(true)
      setTimeout(() => {
        navigate(from || defaultRouteForRole(session.user.role), { replace: true })
      }, 550)
    } catch (error) {
      setErrorMessage(error.message || 'Login failed. Please try again.')
      setIsSubmitting(false)
    }
  }

  const onGuestAccess = () => {
    // Guest session — no token, can only browse public resources
    login({
      role: 'GUEST',
      name: 'Guest',
      token: '',
      refreshToken: '',
      expiresAt: null,
    })
    navigate('/library', { replace: true })
  }

  return (
    <AuthLayout
      eyebrow="Department of Computer Science & Engineering"
      title={<>Digital Knowledge<br />Platform</>}
      description="Centralized repository for academic resources, research papers, and institutional knowledge."
      panelExtra={
        <div className="grid w-full max-w-[360px] grid-cols-3 gap-3">
          {STATS.map(({ label, value, Icon }, index) => (
            <motion.div
              key={label}
              data-cursor-hover
              initial={{ opacity: 0, y: 14, scale: .94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: .45, delay: .5 + index * .08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3, scale: 1.05, borderColor: 'rgba(255,255,255,.35)' }}
              className="grid gap-1.5 rounded-xl border border-white/15 bg-white/10 p-3.5 text-center transition-colors"
            >
              <Icon size={16} className="mx-auto text-white/70" />
              <p className="text-[1.05rem] font-extrabold leading-none text-white tabular-nums">
                <AnimatedStat value={value} delay={600 + index * 80} />
              </p>
              <p className="text-[.7rem] font-semibold text-white/70">{label}</p>
            </motion.div>
          ))}
        </div>
      }
    >
      <ConfettiBurst active={showConfetti} />

      <div className="grid gap-1.5">
        <h2 className="text-[1.75rem] font-extrabold tracking-tight text-[var(--ink)]">
          Welcome back
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Sign in to your CSEDU account to continue.
        </p>
      </div>

      <motion.form
        onSubmit={onSubmit}
        className="grid gap-4"
        variants={formStagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fieldVariants} className="grid gap-1.5">
          <Label htmlFor="identifier">Email address</Label>
          <div className="group relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] transition-colors group-focus-within:text-[var(--accent)]" />
            <Input
              id="identifier"
              name="identifier"
              autoComplete="email"
              placeholder="you@cs.du.ac.bd"
              className="h-11 pl-9 text-[.95rem] transition-shadow duration-200 focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)/.15)]"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
        </motion.div>

        <motion.div variants={fieldVariants} className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="group relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] transition-colors group-focus-within:text-[var(--accent)]" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-11 pl-9 pr-9 text-[.95rem] transition-shadow duration-200 focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)/.15)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[var(--ink)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div
              key="login-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: .25 }}
              className="overflow-hidden"
            >
              <Alert variant="error">{errorMessage}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <MagneticButton variants={fieldVariants} strength={.25}>
          <Button type="submit" size="lg" disabled={isSubmitting} className="auth-shimmer h-11 w-full gap-1.5 text-[.95rem]">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </MagneticButton>

        <motion.div variants={fieldVariants} className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[hsl(var(--border))]" />
          <span className="text-[.78rem] font-semibold text-[var(--muted)]">OR</span>
          <div className="h-px flex-1 bg-[hsl(var(--border))]" />
        </motion.div>

        <MagneticButton variants={fieldVariants} strength={.25}>
          <Button type="button" variant="outline" size="lg" onClick={onGuestAccess} className="h-11 w-full gap-1.5 text-[.95rem]">
            <Compass size={16} /> Guest Access
          </Button>
        </MagneticButton>
      </motion.form>

      <p className="text-center text-sm text-[var(--muted)]">
        Don't have an account?{' '}
        <Link to="/register" className="font-bold text-[var(--accent-strong)] no-underline hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  )
}
