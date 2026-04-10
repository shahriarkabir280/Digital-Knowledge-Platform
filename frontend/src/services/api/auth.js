import { apiRequest } from './client.js'
import { normalizeRole, ROLES } from '../../app/rbac.js'

function inferRoleFromIdentifier(identifier) {
  const value = identifier.toLowerCase()
  if (value.includes('admin')) {
    return ROLES.ADMIN
  }
  if (value.includes('librarian')) {
    return ROLES.LIBRARIAN
  }
  return ROLES.MEMBER
}

function extractToken(payload) {
  return payload?.accessToken || payload?.token || payload?.data?.accessToken || ''
}

function extractUser(payload) {
  const user = payload?.user || payload?.data?.user || {}
  return {
    name: user.name || payload?.name || payload?.username || 'Platform User',
    role: normalizeRole(user.role || payload?.role || ROLES.MEMBER),
  }
}

export async function loginRequest({ identifier, password }) {
  let payload
  try {
    payload = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
  } catch (error) {
    const message = String(error?.message || '')
    const looksLikeNetworkFailure =
      message.includes('Failed to fetch') || message.includes('NetworkError')

    if (looksLikeNetworkFailure) {
      throw new Error(
        'Cannot reach login API at http://localhost:3000/api/auth/login. Start backend server or use Demo Login.',
      )
    }

    throw error
  }

  const token = extractToken(payload)
  if (!token) {
    throw new Error('Login succeeded but token was not returned by API.')
  }

  const user = extractUser(payload)
  const expiresAt = payload?.expiresAt || payload?.exp || null

  return {
    token,
    user,
    expiresAt,
  }
}

export function createDemoSession(identifier) {
  return {
    token: `demo-token-${Date.now()}`,
    user: {
      name: identifier || 'Demo User',
      role: inferRoleFromIdentifier(identifier || ''),
    },
    expiresAt: null,
  }
}
