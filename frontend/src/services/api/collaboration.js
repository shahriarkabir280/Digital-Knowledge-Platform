import { apiRequest } from './client'

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
