import { apiRequest } from './client'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')

/**
 * Download an annotation export as a file.
 *
 * The export endpoint returns a raw file (txt/md/html), not JSON, and is
 * auth-protected. window.open() can't send the Authorization header, so we
 * fetch with the Bearer token and save the response as a Blob instead.
 *
 * @param {string|number} documentId
 * @param {string} format - 'txt' | 'md' | 'html'
 * @param {string} authToken
 */
export async function downloadAnnotationsExport(documentId, format, authToken) {
  const res = await fetch(
    `${API_BASE_URL}/collaboration/documents/${documentId}/annotations/export?format=${encodeURIComponent(format)}`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  )

  if (!res.ok) {
    let message = `Export failed (status ${res.status})`
    try {
      const body = await res.json()
      message = body?.error?.message || body?.message || message
    } catch {
      // response wasn't JSON; keep the default message
    }
    throw new Error(message)
  }

  const blob = await res.blob()

  // Derive a filename from Content-Disposition, falling back to a sane default.
  const disposition = res.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  const filename = match ? match[1] : `annotations.${format}`

  const url = window.URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = filename
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Fetch annotations for a document
 * @param {string|number} documentId
 * @param {string} authToken
 */
export async function fetchAnnotations(documentId, authToken) {
  return apiRequest(`/collaboration/documents/${documentId}/annotations`, {
    authToken,
  })
}

/**
 * Create a new annotation
 * @param {Object} data - Annotation data (documentId, sectionRef, quotedText, commentText, highlightColor, isPublic)
 * @param {string} authToken
 */
export async function createAnnotation(data, authToken) {
  return apiRequest('/collaboration/annotations', {
    method: 'POST',
    body: JSON.stringify(data),
    authToken,
  })
}

/**
 * Delete an annotation
 * @param {string|number} annotationId
 * @param {string} authToken
 */
export async function deleteAnnotation(annotationId, authToken) {
  return apiRequest(`/collaboration/annotations/${annotationId}`, {
    method: 'DELETE',
    authToken,
  })
}

/**
 * Reply to an annotation
 * @param {string|number} annotationId
 * @param {string} replyText
 * @param {string} authToken
 */
export async function replyToAnnotation(annotationId, replyText, authToken) {
  return apiRequest(`/collaboration/annotations/${annotationId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ replyText }),
    authToken,
  })
}

/**
 * Create a reading room
 * @param {string} name
 * @param {string|number} documentId
 * @param {string} authToken
 */
export async function createReadingRoom(name, documentId, authToken) {
  return apiRequest('/collaboration/rooms', {
    method: 'POST',
    body: JSON.stringify({ name, documentId }),
    authToken,
  })
}

/**
 * Fetch reading rooms for a document
 * @param {string|number} documentId
 * @param {string} authToken
 */
export async function fetchReadingRooms(documentId, authToken) {
  return apiRequest(`/collaboration/documents/${documentId}/rooms`, {
    authToken,
  })
}

/**
 * Fetch messages for a room
 * @param {string|number} roomId
 * @param {string} authToken
 */
export async function fetchRoomMessages(roomId, authToken) {
  return apiRequest(`/collaboration/rooms/${roomId}/messages`, {
    authToken,
  })
}

/**
 * Post message to a room
 * @param {string|number} roomId
 * @param {string} messageText
 * @param {string} authToken
 */
export async function postRoomMessage(roomId, messageText, authToken) {
  return apiRequest(`/collaboration/rooms/${roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messageText }),
    authToken,
  })
}

/**
 * Send presence heartbeat to a room
 * @param {string|number} roomId
 * @param {string} authToken
 */
export async function sendRoomHeartbeat(roomId, authToken) {
  return apiRequest(`/collaboration/rooms/${roomId}/presence`, {
    method: 'POST',
    authToken,
  })
}

/**
 * Fetch active presence for a room
 * @param {string|number} roomId
 * @param {string} authToken
 */
export async function fetchRoomPresence(roomId, authToken) {
  return apiRequest(`/collaboration/rooms/${roomId}/presence`, {
    authToken,
  })
}

/**
 * Search users to invite to a reading room
 * @param {string} query - name or email fragment (min 2 chars)
 * @param {string} authToken
 */
export async function searchUsers(query, authToken) {
  return apiRequest(`/collaboration/users/search?q=${encodeURIComponent(query)}`, {
    authToken,
  })
}

/**
 * Invite a user to a reading room (host only)
 * @param {string|number} roomId
 * @param {string|number} inviteeId
 * @param {string} authToken
 */
export async function inviteToRoom(roomId, inviteeId, authToken) {
  return apiRequest(`/collaboration/rooms/${roomId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ inviteeId }),
    authToken,
  })
}

/**
 * Fetch members of a reading room
 * @param {string|number} roomId
 * @param {string} authToken
 */
export async function fetchRoomMembers(roomId, authToken) {
  return apiRequest(`/collaboration/rooms/${roomId}/members`, {
    authToken,
  })
}
