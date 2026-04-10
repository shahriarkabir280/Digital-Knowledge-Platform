import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
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

  const from = location.state?.from?.pathname || '/dashboard'

  if (authState.isAuthenticated && authState.token) {
    return <Navigate to={from} replace />
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

      navigate(from, { replace: true })
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
    navigate(from, { replace: true })
  }

  return (
    <section className="login-wrap">
      <div className="login-card">
        <p className="brand-kicker">Digital Knowledge Platform</p>
        <h2>Login</h2>
        <p className="helper-text">
          Sign in with your account to continue.
        </p>
        <form onSubmit={onSubmit} className="login-form">
          <label htmlFor="identifier">Email or Username</label>
          <input
            id="identifier"
            name="identifier"
            autoComplete="username"
            placeholder="tamim@example.com"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button type="submit" className="primary-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>

          <button type="button" className="ghost-btn" onClick={onDemoLogin}>
            Demo Login
          </button>
        </form>
      </div>
    </section>
  )
}
