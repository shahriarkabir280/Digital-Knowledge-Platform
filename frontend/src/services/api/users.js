import { apiRequest } from './client.js'

export async function listUsersRequest(authToken) {
  const payload = await apiRequest('/users', {
    method: 'GET',
    authToken,
  })

  return payload?.users || []
}

export async function updateUserRoleRequest({ authToken, userId, role }) {
  const payload = await apiRequest(`/users/${userId}/role`, {
    method: 'PATCH',
    authToken,
    body: JSON.stringify({ role }),
  })

  return payload?.user || null
}