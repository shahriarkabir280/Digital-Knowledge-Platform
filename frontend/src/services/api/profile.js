/**
 * Profile API Service
 * Self-service profile: view, update fields, upload avatar.
 */

import { apiRequest } from './client.js'
import { loadAuthSession } from '../../app/auth-session.js'

export async function getMyProfile() {
  return apiRequest('/profile/me')
}

/**
 * @param {Object} data — any of: name, bio, department, phone,
 *   cv_url, linkedin_url, github_url, google_scholar_url, website_url
 */
export async function updateMyProfile(data) {
  return apiRequest('/profile/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Upload/replace the current user's avatar image.
 * @param {File} file
 */
export async function uploadAvatar(file) {
  const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')
  const token = loadAuthSession()?.token || ''

  const formData = new FormData()
  formData.append('avatar', file)

  const res = await fetch(`${base}/profile/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = body?.error?.message || body?.message || 'Avatar upload failed'
    const err = new Error(message)
    err.code = body?.error?.code || null
    throw err
  }
  return body
}
