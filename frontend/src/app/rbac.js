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

export const PUBLIC_ROUTES = [
  ROLES.GUEST,
  ...ALL_AUTH_ROLES,
]

export const ROUTE_ACCESS = Object.freeze({
  library: PUBLIC_ROUTES,
  libraryBookmarks: ALL_AUTH_ROLES,
  libraryWishlist: ALL_AUTH_ROLES,
  libraryResourceDetails: PUBLIC_ROUTES,
  libraryUpload: ALL_AUTH_ROLES,
  librarySettings: ALL_AUTH_ROLES,
  libraryProfile: ALL_AUTH_ROLES,
  libraryActivity: [ROLES.MEMBER, ROLES.CONTRIBUTOR],
  libraryAnalytics: [ROLES.ADMIN, ROLES.STAFF, ROLES.LAB_MANAGER],
  repository: PUBLIC_ROUTES,
  search: PUBLIC_ROUTES,
  viewer: PUBLIC_ROUTES,
  studentProjectShowcase: PUBLIC_ROUTES,
  donateBooks: PUBLIC_ROUTES,
  home: ALL_AUTH_ROLES,
  dashboard: ALL_AUTH_ROLES,
  notifications: ALL_AUTH_ROLES,
  uploadDocument: ALL_AUTH_ROLES,
  submitPaper: ALL_AUTH_ROLES,
  allUploads: [ROLES.STAFF, ROLES.LAB_MANAGER, ROLES.REVIEWER, ROLES.ADMIN],
  reviewQueue: [ROLES.STAFF, ROLES.LAB_MANAGER, ROLES.REVIEWER, ROLES.ADMIN],
  admin: [ROLES.ADMIN],
})

export function defaultRouteForRole(role) {
  if (role === ROLES.GUEST) {
    return '/library'
  }

  if (role === ROLES.ADMIN) {
    return '/dashboard'
  }

  if (role === ROLES.STAFF || role === ROLES.LAB_MANAGER) {
    return '/dashboard'
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
