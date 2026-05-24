import { useMemo, useState } from 'react'
import { AuthContext } from './auth-store.js'
import { normalizeRole, ROLES } from './rbac.js'
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from './auth-session.js'

function isSessionExpired(expiresAt) {
  if (!expiresAt) return false

  const now = Date.now()

  if (typeof expiresAt === 'number') {
    const msValue = expiresAt < 1e12 ? expiresAt * 1000 : expiresAt
    return msValue <= now
  }

  const parsed = Date.parse(expiresAt)
  if (Number.isNaN(parsed)) return false

  return parsed <= now
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const stored = loadAuthSession()
    const token = stored?.token || ''

    if (!stored || !token || isSessionExpired(stored.expiresAt)) {
      if (stored && isSessionExpired(stored.expiresAt)) {
        clearAuthSession()
      }

      return {
        isAuthenticated: false,
        role: ROLES.GUEST,
        name: '',
        token: '',
        expiresAt: null,
      }
    }

    return {
      isAuthenticated: Boolean(stored.isAuthenticated),
      role: normalizeRole(stored.role),
      name: stored.name || '',
      token,
      expiresAt: stored.expiresAt || null,
    }
  })

  const login = ({ role, name, token, expiresAt = null }) => {
    const next = {
      isAuthenticated: true,
      role: normalizeRole(role),
      name: name || 'Platform User',
      token,
      expiresAt,
    }
    setAuthState(next)
    saveAuthSession(next)
  }

  const logout = () => {
    const next = {
      isAuthenticated: false,
      role: ROLES.GUEST,
      name: '',
      token: '',
      expiresAt: null,
    }
    setAuthState(next)
    clearAuthSession()
  }

  const value = useMemo(
    () => ({
      authState,
      login,
      logout,
    }),
    [authState],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
