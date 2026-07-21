import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import { useAuth } from '../app/use-auth.js'
import { defaultRouteForRole } from '../app/rbac.js'
import { registerRequest } from '../services/api/auth.js'
import { User, Mail, Lock, UserPlus, BookOpen, FlaskConical, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react'

const PASSWORD_RULES = [
  { test: (value) => value.length >= 8, message: 'at least 8 characters' },
  { test: (value) => /[A-Z]/.test(value), message: 'an uppercase letter' },
  { test: (value) => /[a-z]/.test(value), message: 'a lowercase letter' },
  { test: (value) => /[0-9]/.test(value), message: 'a number' },
  { test: (value) => /[^A-Za-z0-9]/.test(value), message: 'a special character' },
]

function getPasswordError(password) {
  const failed = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.message)
  if (failed.length === 0) {
    return ''
  }
  return `Password must contain ${failed.join(', ')}.`
}

const FEATURES = [
  { Icon: BookOpen, text: 'Access thousands of academic resources' },
  { Icon: FlaskConical, text: 'Submit and share your research' },
  { Icon: ShieldCheck, text: 'Role-based access control' },
]

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { authState } = useAuth()
  const navigate = useNavigate()

  if (authState.isAuthenticated && authState.token) {
    return <Navigate to={defaultRouteForRole(authState.role)} replace />
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Name, email, and password are required.')
      return
    }
    const passwordError = getPasswordError(password)
    if (passwordError) {
      setErrorMessage(passwordError)
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }
    try {
      setIsSubmitting(true)
      await registerRequest({ name: name.trim(), email: email.trim(), password })
      setSuccessMessage('Account created! Redirecting to login…')
      setTimeout(() => navigate('/login', { replace: true, state: { registeredEmail: email.trim().toLowerCase() } }), 700)
    } catch (error) {
      setErrorMessage(error.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Department of Computer Science & Engineering"
      title={<>Join the<br />Knowledge Hub</>}
      description="Create your institutional account to access research papers, lecture notes, and academic resources."
      panelExtra={
        <div className="grid w-full max-w-[320px] gap-2.5">
          {FEATURES.map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-3 rounded-[10px] border border-white/12 bg-white/10 px-3.5 py-3">
              <Icon size={18} className="shrink-0 text-white/85" />
              <p className="text-[.85rem] font-medium text-white/90">{text}</p>
            </div>
          ))}
        </div>
      }
    >
      <div className="grid gap-1.5">
        <h2 className="text-[1.75rem] font-extrabold tracking-tight text-[var(--ink)]">
          Create account
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Self-registration creates a Member account.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3.5">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Tamim Dewan"
              className="h-11 pl-9 text-[.95rem]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">University email</Label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              id="email"
              name="email"
              autoComplete="email"
              placeholder="tamim@cs.du.ac.bd"
              className="h-11 pl-9 text-[.95rem]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="h-11 pl-9 pr-9 text-[.95rem]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[var(--ink)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Must include an uppercase letter, a lowercase letter, a number, and a special character.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              className="h-11 pl-9 pr-9 text-[.95rem]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[var(--ink)]"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        <Button type="submit" size="lg" disabled={isSubmitting} className="h-11 gap-1.5 text-[.95rem]">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--muted)]">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-[var(--accent-strong)] no-underline hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
