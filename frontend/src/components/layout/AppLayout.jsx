import { Outlet } from 'react-router-dom'
import Navbar from '../navigation/Navbar.jsx'
import Sidebar from '../navigation/Sidebar.jsx'

export default function AppLayout() {
  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>
      <Navbar />
      <div className="main-grid" style={{ flex: 1 }}>
        <Sidebar />
        <main className="content-panel">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
