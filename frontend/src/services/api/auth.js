import { apiRequest } from './client.js'
import { normalizeRole, ROLES } from '../../app/rbac.js'

function inferRoleFromIdentifier(identifier) {
  const value = identifier.toLowerCase()
  if (value.includes('admin')) {
    return ROLES.ADMIN
  }
  if (value.includes('lab') || value.includes('manager')) {
    return ROLES.LAB_MANAGER
  }
  if (value.includes('staff') || value.includes('librarian')) {
    return ROLES.STAFF
  }
  if (value.includes('reviewer')) {
    return ROLES.REVIEWER
  }
  if (value.includes('contributor')) {
    return ROLES.CONTRIBUTOR
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
        'Cannot reach login API. Start backend server or use Demo Login.',
      )
    }

    throw error
  }

  const token = extractToken(payload)
  const refreshToken = payload?.refreshToken || payload?.data?.refreshToken || ''
  if (!token) {
    throw new Error('Login succeeded but token was not returned by API.')
  }

  const user = extractUser(payload)
  const expiresAt = payload?.expiresAt || payload?.exp || null

  return {
    token,
    refreshToken,
    user,
    expiresAt,
  }
}

export async function registerRequest({ name, email, password }) {
  try {
    const payload = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })

    return payload?.user || payload
  } catch (error) {
    const message = String(error?.message || '')
    const looksLikeNetworkFailure =
      message.includes('Failed to fetch') || message.includes('NetworkError')

    if (looksLikeNetworkFailure) {
      throw new Error(
        'Cannot reach registration API. Start backend server and try again.',
      )
    }

    throw error
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
