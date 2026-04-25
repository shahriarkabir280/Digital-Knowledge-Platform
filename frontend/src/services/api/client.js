const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

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

export async function apiRequest(path, options = {}) {
  const { authToken, headers, ...restOptions } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(headers || {}),
    },
    ...restOptions,
  })

  const parsedBody = await parseResponseBody(response)

  if (!response.ok) {
    throw new Error(extractErrorMessage(parsedBody, response.status))
  }

  return parsedBody
}



