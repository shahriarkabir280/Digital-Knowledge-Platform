import { apiRequest } from './client.js'

export async function submitRoleRequest({ authToken, requestedRole, reason }) {
  const payload = await apiRequest('/role-requests', {
    method: 'POST',
    authToken,
    body: JSON.stringify({ requestedRole, reason }),
  })

  return payload?.data?.request || null
}

export async function fetchMyRoleRequests(authToken) {
  const payload = await apiRequest('/role-requests/mine', {
    authToken,
  })

  return payload?.data?.items || []
}

export async function fetchRoleRequests({ authToken, status } = {}) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const payload = await apiRequest(`/role-requests${query}`, {
    authToken,
  })

  return payload?.data?.items || []
}

export async function decideRoleRequest({ authToken, id, decision }) {
  const payload = await apiRequest(`/role-requests/${id}/decision`, {
    method: 'PATCH',
    authToken,
    body: JSON.stringify({ decision }),
  })

  return payload?.data?.request || null
}
