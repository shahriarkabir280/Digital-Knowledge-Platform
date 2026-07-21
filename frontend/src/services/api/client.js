const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')
import { loadAuthSession, saveAuthSession } from '../../app/auth-session.js'

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

function extractErrorMessage(parsedBody, status) {
  if (typeof parsedBody === 'string' && parsedBody.trim()) {
    return parsedBody
  }

  if (parsedBody && typeof parsedBody === 'object') {
    const nestedError = parsedBody.error

    if (typeof nestedError === 'string' && nestedError.trim()) {
      return nestedError
    }

    if (nestedError && typeof nestedError === 'object') {
      const details = Array.isArray(nestedError.details)
        ? nestedError.details
            .map((item) => item?.message)
            .filter(Boolean)
            .join(', ')
        : ''

      return (
        nestedError.message ||
        details ||
        parsedBody.message ||
        `API request failed with status ${status}`
      )
    }

    return parsedBody.message || `API request failed with status ${status}`
  }

  return `API request failed with status ${status}`
}

// Pull the machine-readable error code (e.g. RESERVED_FOR_HOLDS) out of the
// body so callers can branch on it, not just the human message.
function extractErrorCode(parsedBody) {
  if (parsedBody && typeof parsedBody === 'object') {
    if (parsedBody.error && typeof parsedBody.error === 'object') {
      return parsedBody.error.code || null
    }
    return parsedBody.code || null
  }
  return null
}

// Build an Error that carries the HTTP status and backend error code.
function buildApiError(parsedBody, status) {
  const err = new Error(extractErrorMessage(parsedBody, status))
  err.status = status
  err.code = extractErrorCode(parsedBody)
  err.data = parsedBody && typeof parsedBody === 'object' ? parsedBody : null
  return err
}

export async function apiRequest(path, options = {}) {
  const { authToken, headers, ...restOptions } = options
  const storedSession = loadAuthSession()
  const effectiveAuthToken = authToken || storedSession?.token || ''

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(effectiveAuthToken ? { Authorization: `Bearer ${effectiveAuthToken}` } : {}),
      ...(headers || {}),
    },
    ...restOptions,
  })

  const parsedBody = await parseResponseBody(response)

  // If unauthorized, try to refresh the token once using stored refreshToken
  if (response.status === 401) {
    const stored = loadAuthSession()
    const refreshToken = stored?.refreshToken || ''
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })

        if (refreshRes.ok) {
          const refreshed = await refreshRes.json()
          const newToken = refreshed?.accessToken || refreshed?.token || ''
          const newRefresh = refreshed?.refreshToken || ''
          if (newToken) {
            const nextSession = { ...(stored || {}), token: newToken, refreshToken: newRefresh }
            saveAuthSession(nextSession)

            // retry original request with new token
            const retryResp = await fetch(`${API_BASE_URL}${path}`, {
              headers: {
                'Content-Type': 'application/json',
                ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
                ...(headers || {}),
              },
              ...restOptions,
            })

            const retryBody = await parseResponseBody(retryResp)
            if (!retryResp.ok) {
              throw buildApiError(retryBody, retryResp.status)
            }
            return retryBody
          }
        }
      } catch {
        // fallthrough to throw original error below
      }
    }
  }

  if (!response.ok) {
    throw buildApiError(parsedBody, response.status)
  }

  return parsedBody
}



