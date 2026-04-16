import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import cseduLogo from '@/assets/CSEDULOGO.png'
import { useAuth } from '../app/use-auth.js'
import { defaultRouteForRole } from '../app/rbac.js'
import { registerRequest } from '../services/api/auth.js'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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

    if (password !== confirmPassword) {
      setErrorMessage('Password and confirm password must match.')
      return
    }

    try {
      setIsSubmitting(true)
      await registerRequest({
        name: name.trim(),
        email: email.trim(),
        password,
      })

      setSuccessMessage('Registration successful. Redirecting to login...')
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { registeredEmail: email.trim().toLowerCase() },
        })
      }, 700)
    } catch (error) {
      setErrorMessage(error.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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
          <CardTitle className="text-4xl">Create Account</CardTitle>
          <p className="text-base text-muted-foreground">
            Self-registration creates a Member account using your institutional email.
          </p>
        </CardHeader>
        <CardContent className="p-8 pt-2">
          <form onSubmit={onSubmit} className="grid gap-5">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Tamim Dewan"
                className="h-12 text-base"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-sm font-medium">University email</Label>
              <Input
                id="email"
                name="email"
                autoComplete="email"
                placeholder="tamim@cs.du.ac.bd"
                className="h-12 text-base"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="h-12 text-base"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="h-12 text-base"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}
            {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  )
}