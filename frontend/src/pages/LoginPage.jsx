import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    if (registeredEmail && !identifier) {
      setIdentifier(registeredEmail)
    }
  }, [registeredEmail, identifier])

  const from = location.state?.from?.pathname || ''

  if (authState.isAuthenticated && authState.token) {
    const redirectTarget = from || defaultRouteForRole(authState.role)
    return <Navigate to={redirectTarget} replace />
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Identifier and password are required.')
      return
    }

    try {
      setIsSubmitting(true)
      const session = await loginRequest({
        identifier: identifier.trim(),
        password,
      })

      login({
        role: session.user.role,
        name: session.user.name,
        token: session.token,
        expiresAt: session.expiresAt,
      })

      const redirectTarget = from || defaultRouteForRole(session.user.role)
      navigate(redirectTarget, { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onDemoLogin = () => {
    const session = createDemoSession(identifier.trim())
    login({
      role: session.user.role,
      name: session.user.name,
      token: session.token,
      expiresAt: session.expiresAt,
    })
    const redirectTarget = from || defaultRouteForRole(session.user.role)
    navigate(redirectTarget, { replace: true })
  }

  return (
    <section className="mx-auto flex min-h-[100svh] w-full max-w-xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader className="grid gap-3 p-8 pb-4">
          <div className="auth-brand-block">
            <img src={cseduLogo} alt="CSEDU Logo" className="auth-brand-logo" />
            <div className="auth-brand-copy">
              <p className="brand-kicker">Digital Knowledge Platform</p>
              <p className="auth-brand-title">CSEDU</p>
            </div>
          </div>
          <CardTitle className="text-4xl">Login</CardTitle>
          <p className="text-base text-muted-foreground">Sign in with your account to continue.</p>
        </CardHeader>
        <CardContent className="p-8 pt-2">
          <form onSubmit={onSubmit} className="grid gap-5">
            <div className="grid gap-1.5">
              <Label htmlFor="identifier" className="text-sm font-medium">Email</Label>
              <Input
                id="identifier"
                name="identifier"
                autoComplete="email"
                placeholder="tamim@example.com"
                className="h-12 text-base"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-12 text-base"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>

            <Button type="button" size="lg" variant="outline" onClick={onDemoLogin}>
              Demo Login
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            New here?{' '}
            <Link to="/register" className="font-medium text-foreground hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
