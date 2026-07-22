import { apiRequest } from './client'
import { loadAuthSession, saveAuthSession } from '../../app/auth-session.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')

/**
 * Upload a document file to the repository
 * @param {File} file - The file to upload
 * @param {Object} metadata - Document metadata
 * @param {string} metadata.title - Document title
 * @param {string} [metadata.description] - Document description
 * @param {Function} [onProgress] - Progress callback (receives progress event)
 * @param {string} authToken - JWT authentication token
 * @returns {Promise<Object>} Upload response with document and file info
 */
/**
 * Upload a document file to the repository
 * @param {File} file - The file to upload
 * @param {Object} metadata - Document metadata
 * @param {string} metadata.title - Document title
 * @param {string} [metadata.description] - Document description
 * @param {Function} [onProgress] - Progress callback (receives progress event)
 * @param {string} authToken - JWT authentication token
 * @returns {Promise<Object>} Upload response with document and file info
 */
export async function uploadDocument(file, metadata = {}, onProgress, authToken) {
  const storedSession = loadAuthSession()
  const effectiveAuthToken = authToken || storedSession?.token || ''

  if (!effectiveAuthToken) {
    return Promise.reject(new Error('You must be logged in to upload files.'))
  }

  const formData = new FormData()
  if (file) {
    formData.append('file', file)
  }
  
  if (metadata.title) {
    formData.append('title', metadata.title)
  }
  
  if (metadata.description) {
    formData.append('description', metadata.description)
  }

  // Pass the resource category so the backend stores in the correct subdirectory
  if (metadata.resourceCategory) {
    formData.append('resourceCategory', metadata.resourceCategory)
  }

  // Pass tags/keywords if provided
  if (metadata.tags && Array.isArray(metadata.tags) && metadata.tags.length > 0) {
    formData.append('tags', JSON.stringify(metadata.tags))
  }
  
  if (metadata.keywords && Array.isArray(metadata.keywords) && metadata.keywords.length > 0) {
    formData.append('keywords', JSON.stringify(metadata.keywords))
  }

  // Pass optional metadata fields
  if (metadata.author) {
    formData.append('author', metadata.author)
  }

  // Always append department (can be empty string, backend will handle it)
  formData.append('department', metadata.department || '')

  // Always append course (can be empty string, backend will handle it)
  formData.append('course', metadata.course || '')

  if (metadata.year) {
    formData.append('year', metadata.year)
  }

  if (metadata.publishedYear) {
    formData.append('publishedYear', metadata.publishedYear)
  }

  if (metadata.language) {
    formData.append('language', metadata.language)
  }

  if (metadata.state) {
    formData.append('state', metadata.state)
  }

  if (metadata.linkUrl) {
    formData.append('linkUrl', metadata.linkUrl)
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.timeout = 120000

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent: percentComplete,
          })
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch (error) {
          reject(new Error('Failed to parse upload response'))
        }
      } else if (xhr.status === 401) {
        reject(new Error('Your session has expired. Please refresh the page and log in again.'))
      } else {
        try {
          const error = JSON.parse(xhr.responseText)
          reject(new Error(error.error || `Upload failed with status ${xhr.status}`))
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload. Please check your connection.'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'))
    })

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out. Please retry with a smaller file or better connection.'))
    })

    xhr.open('POST', `${API_BASE_URL}/repository/upload`)
    xhr.setRequestHeader('Authorization', `Bearer ${effectiveAuthToken}`)
    xhr.send(formData)
  })
}

/**
 * Replace the underlying file of an existing document, incrementing its
 * version. Only valid while the document is in a state that allows file
 * changes (draft/paused) — the backend enforces this via ownership; state
 * gating is the caller's responsibility on the UI side.
 * @param {number|string} documentId - Document ID
 * @param {File} file - The replacement file
 * @param {string} authToken - JWT authentication token
 * @param {Function} [onProgress] - Progress callback (receives progress event)
 * @returns {Promise<Object>} Replace response with updated document/file info
 */
export async function replaceDocumentFile(documentId, file, authToken, onProgress) {
  const storedSession = loadAuthSession()
  const effectiveAuthToken = authToken || storedSession?.token || ''

  if (!effectiveAuthToken) {
    return Promise.reject(new Error('You must be logged in to replace this file.'))
  }

  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.timeout = 120000

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100),
          })
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch (error) {
          reject(new Error('Failed to parse replace-file response'))
        }
      } else if (xhr.status === 401) {
        reject(new Error('Your session has expired. Please refresh the page and log in again.'))
      } else {
        try {
          const error = JSON.parse(xhr.responseText)
          reject(new Error(error.error || `Replacing the file failed with status ${xhr.status}`))
        } catch {
          reject(new Error(`Replacing the file failed with status ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error while replacing the file. Please check your connection.'))
    })
    xhr.addEventListener('abort', () => reject(new Error('Replace cancelled')))
    xhr.addEventListener('timeout', () => reject(new Error('Replace timed out. Please retry with a smaller file or better connection.')))

    xhr.open('PUT', `${API_BASE_URL}/documents/${documentId}/file`)
    xhr.setRequestHeader('Authorization', `Bearer ${effectiveAuthToken}`)
    xhr.send(formData)
  })
}

/**
 * Fetch list of documents in the repository
 * @param {string} authToken - JWT authentication token
 * @returns {Promise<Array>} List of documents
 */
export async function fetchDocuments(authToken) {
  return apiRequest('/repository/documents', {
    authToken,
  })
}

/**
 * Get document details by ID
 * @param {number} documentId - Document ID
 * @param {string} authToken - JWT authentication token
 * @returns {Promise<Object>} Document details
 */
export async function getDocument(documentId, authToken) {
  return apiRequest(`/repository/files/${documentId}`, {
    authToken,
  })
}

/**
 * Delete a document
 * @param {number} documentId - Document ID
 * @param {string} authToken - JWT authentication token
 * @returns {Promise<Object>} Deletion response
 */
export async function deleteDocument(documentId, authToken) {
  return apiRequest(`/repository/files/${documentId}`, {
    method: 'DELETE',
    authToken,
  })
}

/**
 * Fetch uploads for current authenticated user
 * @param {Object} filters - Optional state/type filters
 * @param {string} [filters.state] - Lifecycle state filter
 * @param {string} [filters.type] - Document type filter
 * @param {string} authToken - JWT authentication token
 * @returns {Promise<Object>} My uploads list response
 */
export async function fetchMyUploads(filters = {}, authToken) {
  const params = new URLSearchParams()

  if (filters.state) {
    params.set('state', filters.state)
  }

  if (filters.type) {
    params.set('type', filters.type)
  }

  const query = params.toString() ? `?${params.toString()}` : ''

  return apiRequest(`/documents/my-uploads${query}`, {
    authToken,
  })
}

/**
 * Fetch staff/reviewer review queue (state=review)
 * @param {Object} filters - Optional filters
 * @param {string} [filters.type] - Document type filter
 * @param {string} authToken - JWT token
 * @returns {Promise<Object>} Review queue response
 */
export async function fetchReviewQueue(filters = {}, authToken) {
  const params = new URLSearchParams()

  if (filters.type) {
    params.set('type', filters.type)
  }

  const query = params.toString() ? `?${params.toString()}` : ''

  return apiRequest(`/documents/review-queue${query}`, {
    authToken,
  })
}

/**
 * Fetch all uploads for staff/reviewer/admin
 * @param {Object} filters - Optional filters
 * @param {string} [filters.state] - Lifecycle state filter
 * @param {string} [filters.type] - Document type filter
 * @param {string|number} [filters.uploaderId] - Uploader ID filter
 * @param {string} [filters.accessTier] - Access tier filter
 * @param {string} authToken - JWT token
 * @returns {Promise<Object>} All uploads response
 */
export async function fetchAllUploads(filters = {}, authToken) {
  const params = new URLSearchParams()

  if (filters.state) {
    params.set('state', filters.state)
  }

  if (filters.type) {
    params.set('type', filters.type)
  }

  if (filters.uploaderId) {
    params.set('uploaderId', String(filters.uploaderId))
  }

  if (filters.accessTier) {
    params.set('accessTier', filters.accessTier)
  }

  if (filters.search) {
    params.set('search', filters.search)
  }

  const query = params.toString() ? `?${params.toString()}` : ''

  return apiRequest(`/documents/all-uploads${query}`, {
    authToken,
  })
}

/**
 * Get document metadata
 * @param {number|string} documentId - Document ID
 * @param {string} authToken - JWT token
 * @returns {Promise<Object>} Metadata response
 */
export async function getDocumentMetadata(documentId, authToken) {
  return apiRequest(`/repository/${documentId}/metadata`, {
    authToken,
  })
}

/**
 * Create metadata for a document
 * @param {number|string} documentId - Document ID
 * @param {Object} payload - Metadata payload
 * @param {string} authToken - JWT token
 * @returns {Promise<Object>} Metadata create response
 */
export async function createDocumentMetadata(documentId, payload, authToken) {
  return apiRequest(`/repository/${documentId}/metadata`, {
    method: 'POST',
    authToken,
    body: JSON.stringify(payload),
  })
}

/**
 * Update metadata for a document
 * @param {number|string} documentId - Document ID
 * @param {Object} payload - Metadata payload
 * @param {string} authToken - JWT token
 * @returns {Promise<Object>} Metadata update response
 */
export async function updateDocumentMetadata(documentId, payload, authToken) {
  return apiRequest(`/repository/${documentId}/metadata`, {
    method: 'PUT',
    authToken,
    body: JSON.stringify(payload),
  })
}

/**
 * Upsert metadata for a document.
 * Tries update first (common path), then creates if metadata does not yet exist.
 * @param {number|string} documentId - Document ID
 * @param {Object} payload - Metadata payload
 * @param {string} authToken - JWT token
 * @returns {Promise<Object>} Metadata save response
 */
export async function saveDocumentMetadata(documentId, payload, authToken) {
  try {
    return await updateDocumentMetadata(documentId, payload, authToken)
  } catch (error) {
    const message = String(error?.message || '').toLowerCase()
    const shouldCreate =
      message.includes('metadata does not exist') || message.includes('metadata_not_found')

    if (shouldCreate) {
      return createDocumentMetadata(documentId, payload, authToken)
    }

    throw error
  }
}

/**
 * Move document through lifecycle state
 * @param {number|string} documentId - Document ID
 * @param {string} state - Target state
 * @param {string} authToken - JWT token
 * @param {string} [note] - Optional transition note
 * @returns {Promise<Object>} State transition response
 */
export async function patchDocumentState(documentId, state, authToken, note) {
  const payload = {
    state,
  }

  if (note && String(note).trim()) {
    payload.note = String(note).trim()
  }

  return apiRequest(`/documents/${documentId}/state`, {
    method: 'PATCH',
    authToken,
    body: JSON.stringify(payload),
  })
}

/**
 * Open a document in a new tab by downloading authenticated blob content.
 * @param {number|string} documentId - Document ID
 * @param {string} authToken - JWT token
 */
export async function openDocumentInNewTab(documentId, authToken) {
  // Open immediately from user gesture context so popup blockers don't block it.
  const previewWindow = window.open('', '_blank')

  if (previewWindow) {
    previewWindow.document.write('<p style="font-family: sans-serif; padding: 12px;">Loading document preview...</p>')
  }

  const response = await fetch(`${API_BASE_URL}/repository/files/${documentId}/content`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  if (!response.ok) {
    if (previewWindow) {
      previewWindow.close()
    }

    let message = `Failed to open document (${response.status})`
    try {
      const data = await response.json()
      message = data?.error || message
    } catch {
      // Keep default message.
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)

  if (previewWindow) {
    previewWindow.location.href = blobUrl
  } else {
    // Fallback when popup creation is blocked.
    window.location.assign(blobUrl)
  }

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl)
  }, 60000)
}

/**
 * Fetch notifications for current user
 * @param {string} authToken - JWT token
 * @param {number} [limit=30] - Max items
 * @returns {Promise<Object>} Notifications response
 */
export async function fetchNotifications(authToken, limit = 30) {
  return apiRequest(`/documents/notifications?limit=${limit}`, {
    authToken,
  })
}

/**
 * Mark one notification as read
 * @param {number|string} notificationId - Notification ID
 * @param {string} authToken - JWT token
 * @returns {Promise<Object>} Read update response
 */
export async function markNotificationRead(notificationId, authToken) {
  return apiRequest(`/documents/notifications/${notificationId}/read`, {
    method: 'PATCH',
    authToken,
  })
}

/**
 * Mark all notifications as read
 * @param {string} authToken - JWT token
 * @returns {Promise<Object>} Read-all update response
 */
export async function markAllNotificationsRead(authToken) {
  return apiRequest('/documents/notifications/read-all', {
    method: 'PATCH',
    authToken,
  })
}

/**
 * Fetch document state transition audit logs
 * @param {number|string} documentId - Document ID
 * @param {string} authToken - JWT token
 * @returns {Promise<Object>} Audit log response
 */
export async function fetchDocumentAuditLogs(documentId, authToken) {
  return apiRequest(`/documents/${documentId}/audit-logs`, {
    authToken,
  })
}
