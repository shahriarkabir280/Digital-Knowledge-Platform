import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/use-auth.js'

export default function Navbar() {
  const { authState, logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div className="brand-block">
        <p className="brand-kicker">Digital Knowledge Platform</p>
        <h1>Frontend Shell</h1>
      </div>
      <div className="topbar-actions">
        <span className="role-pill">Role: {authState.role}</span>
        <span className="user-pill">{authState.name || 'Anonymous'}</span>
        <button type="button" className="ghost-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  )
}
