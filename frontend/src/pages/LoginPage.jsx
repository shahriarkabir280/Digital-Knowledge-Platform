import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import cseduLogo from '@/assets/CSEDULOGO.png'
import { defaultRouteForRole } from '../app/rbac.js'
import { useAuth } from '../app/use-auth.js'
import { createDemoSession, loginRequest } from '../services/api/auth.js'

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
      login({ role: session.user.role, name: session.user.name, token: session.token, expiresAt: session.expiresAt })
      navigate(from || defaultRouteForRole(session.user.role), { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onDemoLogin = () => {
    const session = createDemoSession(identifier.trim())
    login({ role: session.user.role, name: session.user.name, token: session.token, expiresAt: session.expiresAt })
    navigate(from || defaultRouteForRole(session.user.role), { replace: true })
  }

  return (
    <div className="auth-page-grid" style={{ minHeight: '100svh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* Left panel — branding */}
      <div style={{
        background: 'linear-gradient(145deg, var(--brand-700) 0%, var(--brand-500) 60%, var(--brand-400) 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px',
        gap: '32px',
      }}
        className="auth-left-panel"
      >
        <div style={{ textAlign: 'center', display: 'grid', gap: '20px' }}>
          <img
            src={cseduLogo}
            alt="CSEDU Logo"
            style={{ width: '96px', height: '96px', borderRadius: '20px', border: '3px solid rgba(255,255,255,.25)', margin: '0 auto', objectFit: 'cover' }}
          />
          <div style={{ color: '#fff' }}>
            <p style={{ fontSize: '.8rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .75, marginBottom: '8px' }}>
              Department of Computer Science &amp; Engineering
            </p>
            <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: '12px' }}>
              Digital Knowledge<br />Platform
            </h1>
            <p style={{ fontSize: '.95rem', opacity: .8, lineHeight: 1.6, maxWidth: '32ch', margin: '0 auto' }}>
              Centralized repository for academic resources, research papers, and institutional knowledge.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', width: '100%', maxWidth: '360px' }}>
          {[
            { label: 'Documents', value: '12,490+' },
            { label: 'Researchers', value: '840+' },
            { label: 'Downloads', value: '84K+' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,.12)',
              borderRadius: '12px',
              padding: '14px 10px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,.15)',
            }}>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>{stat.value}</p>
              <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '.72rem', marginTop: '4px', fontWeight: 600 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 40px',
        background: 'hsl(var(--background))',
      }}>
        <div style={{ width: '100%', maxWidth: '400px', display: 'grid', gap: '28px' }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
              Welcome back
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
              Sign in to your CSEDU account to continue.
            </p>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gap: '6px' }}>
              <Label htmlFor="identifier">Email address</Label>
              <Input
                id="identifier"
                name="identifier"
                autoComplete="email"
                placeholder="you@cs.du.ac.bd"
                style={{ height: '44px', fontSize: '.95rem' }}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gap: '6px' }}>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                style={{ height: '44px', fontSize: '.95rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

            <Button type="submit" size="lg" disabled={isSubmitting} style={{ height: '44px', fontSize: '.95rem' }}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'hsl(var(--border))' }} />
              <span style={{ fontSize: '.78rem', color: 'var(--muted)', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'hsl(var(--border))' }} />
            </div>

            <Button type="button" variant="outline" size="lg" onClick={onDemoLogin} style={{ height: '44px', fontSize: '.95rem' }}>
              Continue with Demo Account
            </Button>
          </form>

          <p style={{ fontSize: '.875rem', color: 'var(--muted)', textAlign: 'center' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 700, color: 'var(--accent-strong)', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}
            >
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 700px) {
          .auth-left-panel { display: none !important; }
          .auth-page-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
