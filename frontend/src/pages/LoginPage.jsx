import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import { defaultRouteForRole } from '../app/rbac.js'
import { useAuth } from '../app/use-auth.js'
import { loginRequest } from '../services/api/auth.js'
import { Mail, Lock, LogIn, Compass, FileText, Users, Download, Loader2 } from 'lucide-react'

const STATS = [
  { label: 'Documents', value: '12,490+', Icon: FileText },
  { label: 'Researchers', value: '840+', Icon: Users },
  { label: 'Downloads', value: '84K+', Icon: Download },
]

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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
      navigate(from || defaultRouteForRole(session.user.role), { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Login failed. Please try again.')
    } finally {
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
          {STATS.map(({ label, value, Icon }) => (
            <div key={label} className="grid gap-1.5 rounded-xl border border-white/15 bg-white/10 p-3.5 text-center">
              <Icon size={16} className="mx-auto text-white/70" />
              <p className="text-[1.05rem] font-extrabold leading-none text-white">{value}</p>
              <p className="text-[.7rem] font-semibold text-white/70">{label}</p>
            </div>
          ))}
        </div>
      }
    >
      <div className="grid gap-1.5">
        <h2 className="text-[1.75rem] font-extrabold tracking-tight text-[var(--ink)]">
          Welcome back
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Sign in to your CSEDU account to continue.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="identifier">Email address</Label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              id="identifier"
              name="identifier"
              autoComplete="email"
              placeholder="you@cs.du.ac.bd"
              className="h-11 pl-9 text-[.95rem]"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-11 pl-9 text-[.95rem]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <Button type="submit" size="lg" disabled={isSubmitting} className="h-11 gap-1.5 text-[.95rem]">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[hsl(var(--border))]" />
          <span className="text-[.78rem] font-semibold text-[var(--muted)]">OR</span>
          <div className="h-px flex-1 bg-[hsl(var(--border))]" />
        </div>

        <Button type="button" variant="outline" size="lg" onClick={onGuestAccess} className="h-11 gap-1.5 text-[.95rem]">
          <Compass size={16} /> Guest Access
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--muted)]">
        Don't have an account?{' '}
        <Link to="/register" className="font-bold text-[var(--accent-strong)] no-underline hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  )
}
