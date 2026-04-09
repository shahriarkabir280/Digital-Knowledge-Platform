import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../app/use-auth.js'
import { ALL_AUTH_ROLES, ROLES } from '../app/rbac.js'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [selectedRole, setSelectedRole] = useState(ROLES.MEMBER)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  const onSubmit = (event) => {
    event.preventDefault()
    login({ role: selectedRole, name })
    navigate(from, { replace: true })
  }

  return (
    <section className="login-wrap">
      <div className="login-card">
        <p className="brand-kicker">Digital Knowledge Platform</p>
        <h2>Login</h2>
        <p className="helper-text">
          Demo auth flow for protected routes and role-based navigation.
        </p>
        <form onSubmit={onSubmit} className="login-form">
          <label htmlFor="name">Display Name</label>
          <input
            id="name"
            placeholder="Tamim"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value)}
          >
            {ALL_AUTH_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <button type="submit" className="primary-btn">
            Continue
          </button>
        </form>
      </div>
    </section>
  )
}
