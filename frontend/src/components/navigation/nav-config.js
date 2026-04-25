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
    label: 'Library Hub',
    iconName: 'BookOpen',
    roles: ROUTE_ACCESS.library,
  },
  {
    to: '/library/upload',
    label: 'Upload Assets',
    iconName: 'UploadCloud',
    roles: ROUTE_ACCESS.libraryUpload,
  },
  {
    to: '/library/bookmarks',
    label: 'My Favorites',
    iconName: 'Bookmark',
    roles: ROUTE_ACCESS.libraryBookmarks,
  },
  {
    to: '/library/analytics',
    label: 'Insights',
    iconName: 'BarChart3',
    roles: ROUTE_ACCESS.libraryAnalytics,
  },
  {
    to: '/library/settings',
    label: 'Settings',
    iconName: 'Settings2',
    roles: ROUTE_ACCESS.librarySettings,
  },
  {
    to: '/all-uploads',
    label: 'Global Records',
    iconName: 'Globe2',
    roles: ROUTE_ACCESS.allUploads,
  },
  {
    to: '/review-queue',
    label: 'Review Lab',
    iconName: 'ClipboardCheck',
    roles: ROUTE_ACCESS.reviewQueue,
  },
  {
    to: '/admin',
    label: 'System Admin',
    iconName: 'ShieldCheck',
    roles: ROUTE_ACCESS.admin,
  },
]
