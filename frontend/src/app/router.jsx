import { createBrowserRouter } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx'
import AdminRoleManagementPage from '../pages/AdminRoleManagementPage.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import HomePage from '../pages/HomePage.jsx'
import LibraryPage from '../pages/LibraryPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import RepositoryPage from '../pages/RepositoryPage.jsx'
import RoutePage from '../pages/RoutePage.jsx'
import SearchPage from '../pages/SearchPage.jsx'
import StaffDashboardPage from '../pages/StaffDashboardPage.jsx'
import UnauthorizedPage from '../pages/UnauthorizedPage.jsx'
import UploadDocumentPage from '../pages/UploadDocumentPage.jsx'
import ViewerPage from '../pages/ViewerPage.jsx'
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
            element: <UploadDocumentPage />,
          },
          {
            path: '/submit-paper',
            element: (
              <RoutePage
                title="Submit Paper"
                description="Start a submission flow for a paper, thesis, or research artifact."
              />
            ),
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
            path: '/library',
            element: <LibraryPage />,
          },
          {
            path: '/search',
            element: <SearchPage />,
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
