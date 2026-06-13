import { useMemo, useState } from 'react'
import { AuthContext } from './auth-store.js'
import { normalizeRole, ROLES } from './rbac.js'
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from './auth-session.js'

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const stored = loadAuthSession()
    const token = stored?.token || ''
    const refreshToken = stored?.refreshToken || ''

    if (!stored || !token) {
      return {
        isAuthenticated: false,
        role: ROLES.GUEST,
        name: '',
        token: '',
        refreshToken: '',
        expiresAt: null,
      }
    }

    return {
      isAuthenticated: Boolean(stored.isAuthenticated),
      role: normalizeRole(stored.role),
      name: stored.name || '',
      token,
      refreshToken,
      expiresAt: stored.expiresAt || null,
    }
  })

  const login = ({ role, name, token, refreshToken = '', expiresAt = null }) => {
    const next = {
      isAuthenticated: true,
      role: normalizeRole(role),
      name: name || 'Platform User',
      token,
      refreshToken,
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
