export const ROLES = Object.freeze({
  GUEST: 'GUEST',
  MEMBER: 'MEMBER',
  CONTRIBUTOR: 'CONTRIBUTOR',
  STAFF: 'STAFF',
  LAB_MANAGER: 'LAB_MANAGER',
  ADMIN: 'ADMIN',
  REVIEWER: 'REVIEWER',
})

export const ALL_AUTH_ROLES = [
  ROLES.MEMBER,
  ROLES.CONTRIBUTOR,
  ROLES.STAFF,
  ROLES.LAB_MANAGER,
  ROLES.ADMIN,
  ROLES.REVIEWER,
]

export const ROUTE_ACCESS = Object.freeze({
  home: ALL_AUTH_ROLES,
  dashboard: ALL_AUTH_ROLES,
  notifications: ALL_AUTH_ROLES,
  uploadDocument: ALL_AUTH_ROLES,
  repository: ALL_AUTH_ROLES,
  library: ALL_AUTH_ROLES,
  libraryBookmarks: ALL_AUTH_ROLES,
  libraryUpload: ALL_AUTH_ROLES,
  librarySettings: ALL_AUTH_ROLES,
  libraryProfile: ALL_AUTH_ROLES,
  libraryAnalytics: [ROLES.ADMIN, ROLES.STAFF, ROLES.LAB_MANAGER],
  search: ALL_AUTH_ROLES,
  viewer: ALL_AUTH_ROLES,
  studentProjectShowcase: ALL_AUTH_ROLES,
  allUploads: [ROLES.STAFF, ROLES.LAB_MANAGER, ROLES.REVIEWER, ROLES.ADMIN],
  reviewQueue: [ROLES.STAFF, ROLES.LAB_MANAGER, ROLES.REVIEWER, ROLES.ADMIN],
  admin: [ROLES.ADMIN],
})

export function defaultRouteForRole(role) {
  if (role === ROLES.ADMIN) {
    return '/dashboard/admin'
  }

  if (role === ROLES.STAFF || role === ROLES.LAB_MANAGER) {
    return '/dashboard/staff'
  }

  return '/dashboard'
}

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

  if (role === 'LIBRARIAN') {
    return ROLES.STAFF
  }

  return ROLES.GUEST
}
