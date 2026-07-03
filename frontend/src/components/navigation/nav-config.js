import { ROUTE_ACCESS } from '../../app/rbac.js'

export const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    iconName: 'LayoutDashboard',
    roles: ROUTE_ACCESS.dashboard,
  },
  {
    to: '/repository',
    label: 'Research Repository',
    iconName: 'GraduationCap',
    roles: ROUTE_ACCESS.repository,
  },
  {
    to: '/library',
    label: 'Academic Resources',
    iconName: 'BookOpen',
    roles: ROUTE_ACCESS.library,
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
    to: '/student-projects',
    label: 'Project Showcase',
    iconName: 'Layers',
    roles: ROUTE_ACCESS.studentProjectShowcase,
  },
  {
    to: '/all-uploads',
    label: 'Global Records',
    iconName: 'Globe2',
    roles: ROUTE_ACCESS.allUploads,
  },
  {
    to: '/library-moderation-queue',
    label: 'Library Moderation',
    iconName: 'ClipboardCheck',
    roles: ROUTE_ACCESS.reviewQueue,
  },
  {
    to: '/library/settings',
    label: 'Settings',
    iconName: 'Settings2',
    roles: ROUTE_ACCESS.librarySettings,
  },
]
