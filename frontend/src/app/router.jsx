import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout.jsx'
import HomePage from '../pages/HomePage.jsx'
import LibraryPage from '../pages/LibraryPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import RepositoryPage from '../pages/RepositoryPage.jsx'
import RoutePage from '../pages/RoutePage.jsx'
import SearchPage from '../pages/SearchPage.jsx'
import UnauthorizedPage from '../pages/UnauthorizedPage.jsx'
import ViewerPage from '../pages/ViewerPage.jsx'
import ProtectedRoute from '../routes/ProtectedRoute.jsx'
import RoleRoute from '../routes/RoleRoute.jsx'
import { ROUTE_ACCESS } from './rbac.js'

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
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
            element: (
              <RoutePage
                title="Dashboard"
                description="Main operational snapshot and personalized quick actions."
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
                element: (
                  <RoutePage
                    title="Admin"
                    description="Role and system administration control panel skeleton."
                  />
                ),
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
