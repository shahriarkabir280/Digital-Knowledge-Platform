import { createBrowserRouter } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx'
import AdminRoleManagementPage from '../pages/AdminRoleManagementPage.jsx'
import AllUploadsPage from '../pages/AllUploadsPage.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import HomePage from '../pages/HomePage.jsx'
import LibraryPage from '../pages/LibraryPage.jsx'
import LibraryBookmarksPage from '../pages/LibraryBookmarksPage.jsx'
import LibraryProfilePage from '../pages/LibraryProfilePage.jsx'
import LibraryResourceDetailsPage from '../pages/LibraryResourceDetailsPage.jsx'
import LibrarySettingsPage from '../pages/LibrarySettingsPage.jsx'
import LibraryUploadPage from '../pages/LibraryUploadPage.jsx'
import LibraryAnalyticsPage from '../pages/LibraryAnalyticsPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import NotificationsPage from '../pages/NotificationsPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import RepositoryPage from '../pages/RepositoryPage.jsx'
import ReviewQueuePage from '../pages/ReviewQueuePage.jsx'
import RoutePage from '../pages/RoutePage.jsx'
import SearchPage from '../pages/SearchPage.jsx'
import StaffDashboardPage from '../pages/StaffDashboardPage.jsx'
import StudentProjectShowcasePage from '../pages/StudentProjectShowcasePage.jsx'
import UnauthorizedPage from '../pages/UnauthorizedPage.jsx'
import ViewerPage from '../pages/ViewerPage.jsx'
import SubmissionWizardPage from '../pages/SubmissionWizardPage.jsx'
import ProtectedRoute from '../routes/ProtectedRoute.jsx'
import RoleRoute from '../routes/RoleRoute.jsx'
import { ROLES, ROUTE_ACCESS } from './rbac.js'

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
            element: <HomePage />,
          },
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/notifications',
            element: <NotificationsPage />,
          },
          {
            element: <RoleRoute allowedRoles={[ROLES.ADMIN]} />,
            children: [
              {
                path: '/dashboard/admin',
                element: <AdminDashboardPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={[ROLES.STAFF, ROLES.LAB_MANAGER]} />,
            children: [
              {
                path: '/dashboard/staff',
                element: <StaffDashboardPage />,
              },
            ],
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
            element: (
              <RoutePage
                title="Borrow Item"
                description="Open the circulation workflow for requesting an available library item."
              />
            ),
          },
          {
            path: '/repository',
            element: <RepositoryPage />,
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
            path: '/library',
            element: <LibraryPage />,
          },
          {
            path: '/library/resource/:resourceId',
            element: <LibraryResourceDetailsPage />,
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
            path: '/library/profile',
            element: <LibraryProfilePage />,
          },
          {
            path: '/library/settings',
            element: <LibrarySettingsPage />,
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
            path: '/uploads',
            element: <Navigate to="/library/upload" replace />,
          },
          {
            path: '/bookmarks',
            element: <Navigate to="/library/bookmarks" replace />,
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
        element: <UnauthorizedPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
