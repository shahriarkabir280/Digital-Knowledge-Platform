import { useMemo, useState } from 'react'
import { AuthContext } from './auth-store.js'
import { normalizeRole, ROLES } from './rbac.js'

const STORAGE_KEY = 'dkp.auth'

const readStoredAuth = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const stored = readStoredAuth()
    if (!stored) {
      return {
        isAuthenticated: false,
        role: ROLES.GUEST,
        name: '',
      }
    }

    return {
      isAuthenticated: Boolean(stored.isAuthenticated),
      role: normalizeRole(stored.role),
      name: stored.name || '',
    }
  })

  const login = ({ role, name }) => {
    const next = {
      isAuthenticated: true,
      role: normalizeRole(role),
      name: name || 'Platform User',
    }
    setAuthState(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const logout = () => {
    const next = {
      isAuthenticated: false,
      role: ROLES.GUEST,
      name: '',
    }
    setAuthState(next)
    window.localStorage.removeItem(STORAGE_KEY)
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
