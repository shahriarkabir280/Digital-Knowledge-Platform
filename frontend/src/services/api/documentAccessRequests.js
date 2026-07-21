import { apiRequest } from './client.js'

/**
 * Request access to a RESTRICTED document.
 * @param {Object} params
 * @param {string} params.authToken
 * @param {number|string} params.documentId
 * @param {string} [params.message] - Optional note for the author
 */
export async function requestDocumentAccess({ authToken, documentId, message }) {
  const payload = await apiRequest(`/documents/${documentId}/access-requests`, {
    method: 'POST',
    authToken,
    body: JSON.stringify(message ? { message } : {}),
  })

  return payload?.data?.request || null
}

/**
 * Access requests the current user has submitted.
 */
export async function fetchMyAccessRequests(authToken) {
  const payload = await apiRequest('/documents/access-requests/mine', {
    authToken,
  })

  return payload?.data?.items || []
}

/**
 * Access requests awaiting decision for documents the current user authored.
 * @param {Object} params
 * @param {string} params.authToken
 * @param {string} [params.status]
 */
export async function fetchIncomingAccessRequests({ authToken, status } = {}) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const payload = await apiRequest(`/documents/access-requests/incoming${query}`, {
    authToken,
  })

  return payload?.data?.items || []
}

/**
 * Approve or reject an access request.
 * @param {Object} params
 * @param {string} params.authToken
 * @param {number|string} params.requestId
 * @param {'APPROVED'|'REJECTED'} params.decision
 */
export async function decideAccessRequest({ authToken, requestId, decision }) {
  const payload = await apiRequest(`/documents/access-requests/${requestId}/decision`, {
    method: 'PATCH',
    authToken,
    body: JSON.stringify({ decision }),
  })

  return payload?.data?.request || null
}
