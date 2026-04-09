export const ROLES = Object.freeze({
  GUEST: 'GUEST',
  MEMBER: 'MEMBER',
  LIBRARIAN: 'LIBRARIAN',
  ADMIN: 'ADMIN',
})

export const ALL_AUTH_ROLES = [ROLES.MEMBER, ROLES.LIBRARIAN, ROLES.ADMIN]

export const ROUTE_ACCESS = Object.freeze({
  home: ALL_AUTH_ROLES,
  dashboard: ALL_AUTH_ROLES,
  repository: ALL_AUTH_ROLES,
  library: ALL_AUTH_ROLES,
  search: ALL_AUTH_ROLES,
  viewer: ALL_AUTH_ROLES,
  admin: [ROLES.ADMIN],
})

export function normalizeRole(input) {
  if (!input) {
    return ROLES.GUEST
  }

  const role = String(input).trim().toUpperCase()
  if (Object.values(ROLES).includes(role)) {
    return role
  }

  if (role === 'USER') {
    return ROLES.MEMBER
  }

  return ROLES.GUEST
}
