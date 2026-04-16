import { ROUTE_ACCESS } from '../../app/rbac.js'

export const navItems = [
  {
    to: '/',
    label: 'Home',
    roles: ROUTE_ACCESS.home,
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    roles: ROUTE_ACCESS.dashboard,
  },
  {
    to: '/submit-paper',
    label: 'Submission Wizard',
    roles: ROUTE_ACCESS.uploadDocument,
  },
  {
    to: '/repository',
    label: 'Repository',
    roles: ROUTE_ACCESS.repository,
  },
  {
    to: '/library',
    label: 'Library',
    roles: ROUTE_ACCESS.library,
  },
  {
    to: '/search',
    label: 'Search',
    roles: ROUTE_ACCESS.search,
  },
  {
    to: '/student-projects',
    label: 'Project Showcase',
    roles: ROUTE_ACCESS.studentProjectShowcase,
  },
  {
    to: '/all-uploads',
    label: 'All Uploads',
    roles: ROUTE_ACCESS.allUploads,
  },
  {
    to: '/review-queue',
    label: 'Review Queue',
    roles: ROUTE_ACCESS.reviewQueue,
  },
  {
    to: '/viewer/sample-doc',
    label: 'Viewer',
    roles: ROUTE_ACCESS.viewer,
  },
  {
    to: '/admin',
    label: 'Admin',
    roles: ROUTE_ACCESS.admin,
  },
]
