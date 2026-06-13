import { Outlet } from 'react-router-dom'
import Navbar from '../navigation/Navbar.jsx'
import Sidebar from '../navigation/Sidebar.jsx'
import { LayoutProvider, useLayout } from '../../app/layout-context.jsx'

function AppLayoutContent() {
  const { isMobileMenuOpen, closeMobileMenu, isSidebarCollapsed } = useLayout()

  return (
    <div
      className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100svh',
        '--sidebar-width': isSidebarCollapsed ? '72px' : '256px',
      }}
    >
      <Navbar />
      <div className="main-grid" style={{ flex: 1 }}>
        <Sidebar />
        <main className="content-panel">
          <Outlet />
        </main>
      </div>

      {/* Backdrop overlay for mobile drawer menu */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export default function AppLayout() {
  return (
    <LayoutProvider>
      <AppLayoutContent />
    </LayoutProvider>
  )
}
