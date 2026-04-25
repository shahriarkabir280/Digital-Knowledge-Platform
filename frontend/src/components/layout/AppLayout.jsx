import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../navigation/Navbar.jsx'
import Sidebar from '../navigation/Sidebar.jsx'

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="main-grid">
        <Sidebar />
        <main className="content-panel">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
