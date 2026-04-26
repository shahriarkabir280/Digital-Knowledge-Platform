import { Outlet } from 'react-router-dom'
import ModernNavbar from '../navigation/ModernNavbar.jsx'
import ModernSidebar from '../navigation/ModernSidebar.jsx'

export default function AppLayout() {
  return (
    <div className="flex h-screen flex-col">
      <ModernNavbar />
      <div className="flex flex-1 overflow-hidden">
        <ModernSidebar />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
