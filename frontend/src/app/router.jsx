import { createBrowserRouter } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx'
import AdminRoleManagementPage from '../pages/AdminRoleManagementPage.jsx'
import AllUploadsPage from '../pages/AllUploadsPage.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import LibraryPage from '../pages/LibraryPage.jsx'
import LibraryBookmarksPage from '../pages/LibraryBookmarksPage.jsx'
import LibraryProfilePage from '../pages/LibraryProfilePage.jsx'
import LibraryResourceDetailsPage from '../pages/LibraryResourceDetailsPage.jsx'
import LibrarySettingsPage from '../pages/LibrarySettingsPage.jsx'
import LibraryUploadPage from '../pages/LibraryUploadPage.jsx'
import LibraryWishlistPage from '../pages/LibraryWishlistPage.jsx'
import LibraryAnalyticsPage from '../pages/LibraryAnalyticsPage.jsx'
import LibraryModerationPage from '../pages/LibraryModerationPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import ModerationQueuePage from '../pages/ModerationQueuePage.jsx'
import ProjectModerationPage from '../pages/ProjectModerationPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import NotificationsPage from '../pages/NotificationsPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import RepositoryPage from '../pages/RepositoryPage.jsx'
import ReviewQueuePage from '../pages/ReviewQueuePage.jsx'
import RoutePage from '../pages/RoutePage.jsx'
import SearchPage from '../pages/SearchPage.jsx'
import CatalogCirculationPage from '../pages/CatalogCirculationPage.jsx'
import StaffDashboardPage from '../pages/StaffDashboardPage.jsx'
import StudentProjectShowcasePage from '../pages/StudentProjectShowcasePage.jsx'
import ViewerPage from '../pages/ViewerPage.jsx'
import SubmissionWizardPage from '../pages/SubmissionWizardPage.jsx'
import ProtectedRoute from '../routes/ProtectedRoute.jsx'
import RoleRoute from '../routes/RoleRoute.jsx'
import { ROLES, ALL_AUTH_ROLES, ROUTE_ACCESS } from './rbac.js'

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: <Navigate to="/login" replace />,
          },
          {
            element: <RoleRoute allowedRoles={ALL_AUTH_ROLES} />,
            children: [
              {
                path: '/dashboard',
                element: <DashboardPage />,
              },
              {
                path: '/notifications',
                element: <NotificationsPage />,
              },
              {
                path: '/upload-document',
                element: <Navigate to="/submit-paper" replace />,
              },
              {
                path: '/submit-paper',
                element: <SubmissionWizardPage />,
              },
              {
                path: '/metadata-form',
                element: <SubmissionWizardPage />,
              },
              {
                path: '/borrow-item',
                element: <Navigate to="/circulation" replace />,
              },
              {
                path: '/library/upload',
                element: <LibraryUploadPage />,
              },
              {
                path: '/library/bookmarks',
                element: <LibraryBookmarksPage />,
              },
              {
                path: '/library/wishlist',
                element: <LibraryWishlistPage />,
              },
              {
                path: '/library/profile',
                element: <LibraryProfilePage />,
              },
              {
                path: '/library/settings',
                element: <LibrarySettingsPage />,
              },
              {
                path: '/uploads',
                element: <Navigate to="/library/upload" replace />,
              },
              {
                path: '/bookmarks',
                element: <Navigate to="/library/bookmarks" replace />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={[ROLES.ADMIN]} />,
            children: [
              {
                path: '/dashboard/admin',
                element: <AdminDashboardPage />,
              },
              {
                path: '/moderation-queue',
                element: <ModerationQueuePage />,
              },
              {
                path: '/admin/project-moderation',
                element: <ProjectModerationPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={ROUTE_ACCESS.reviewQueue} />,
            children: [
              {
                path: '/review-queue',
                element: <ReviewQueuePage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={ROUTE_ACCESS.reviewQueue} />,
            children: [
              {
                path: '/library-moderation-queue',
                element: <LibraryModerationPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={[ROLES.STAFF, ROLES.LAB_MANAGER, ROLES.ADMIN]} />,
            children: [
              {
                path: '/dashboard/staff',
                element: <StaffDashboardPage />,
              },
              {
                path: '/circulation',
                element: <CatalogCirculationPage />,
              },
            ],
          },
          // Public routes — accessible by GUEST and all authenticated roles
          {
            path: '/library',
            element: <LibraryPage />,
          },
          {
            path: '/library/resource/:resourceId',
            element: <LibraryResourceDetailsPage />,
          },
          {
            path: '/repository',
            element: <RepositoryPage />,
          },
          {
            path: '/search',
            element: <SearchPage />,
          },
          {
            path: '/student-projects',
            element: <StudentProjectShowcasePage />,
          },
          {
            path: '/viewer/:docId?',
            element: <ViewerPage />,
          },
          {
            element: <RoleRoute allowedRoles={ROUTE_ACCESS.allUploads} />,
            children: [
              {
                path: '/all-uploads',
                element: <AllUploadsPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={ROUTE_ACCESS.reviewQueue} />,
            children: [
              {
                path: '/review-queue',
                element: <ReviewQueuePage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={ROUTE_ACCESS.libraryAnalytics} />,
            children: [
              {
                path: '/library/analytics',
                element: <LibraryAnalyticsPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={ROUTE_ACCESS.admin} />,
            children: [
              {
                path: '/admin',
                element: <Navigate to="/dashboard/admin" replace />,
              },
              {
                path: '/admin/panel',
                element: <AdminRoleManagementPage />,
              },
            ],
          },
        ],
      },
      {
        path: '/403',
        element: <Navigate to="/login" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
