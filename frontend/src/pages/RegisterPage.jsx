import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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
    <section className="login-wrap">
      <div className="login-card">
        <p className="brand-kicker">Digital Knowledge Platform</p>
        <h2>Create account</h2>
        <p className="helper-text">
          Self-registration creates a Member account using your institutional
          email.
        </p>

        <form onSubmit={onSubmit} className="login-form">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Tamim Dewan"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <label htmlFor="email">University email</label>
          <input
            id="email"
            name="email"
            autoComplete="email"
            placeholder="tamim@cs.du.ac.bd"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          {successMessage ? <p className="form-success">{successMessage}</p> : null}

          <button type="submit" className="primary-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  )
}