import { apiRequest } from './client'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

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
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    
    if (metadata.title) {
      formData.append('title', metadata.title)
    }
    
    if (metadata.description) {
      formData.append('description', metadata.description)
    }

    const xhr = new XMLHttpRequest()

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
      } else {
        try {
          const error = JSON.parse(xhr.responseText)
          reject(new Error(error.error || 'Upload failed'))
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'))
    })

    xhr.open('POST', `${API_BASE_URL}/repository/upload`)
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
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
