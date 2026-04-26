import { ROUTE_ACCESS } from '../../app/rbac.js'

export const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    iconName: 'LayoutDashboard',
    roles: ROUTE_ACCESS.dashboard,
  },
  {
    to: '/library',
    label: 'Library',
    iconName: 'BookOpen',
    roles: ROUTE_ACCESS.library,
  },
  {
    to: '/repository',
    label: 'My Documents',
    iconName: 'FileText',
    roles: ROUTE_ACCESS.repository,
  },
  {
    to: '/submit-paper',
    label: 'Submit Document',
    iconName: 'Upload',
    roles: ROUTE_ACCESS.uploadDocument,
  },
  {
    to: '/review-queue',
    label: 'Review Queue',
    iconName: 'ClipboardCheck',
    roles: ROUTE_ACCESS.reviewQueue,
  },
  {
    to: '/admin',
    label: 'Admin',
    iconName: 'ShieldCheck',
    roles: ROUTE_ACCESS.admin,
  },
]
