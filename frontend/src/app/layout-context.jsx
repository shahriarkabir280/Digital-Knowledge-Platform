import { createContext, useContext, useState, useEffect, useMemo } from 'react'

const LayoutContext = createContext(null)

export function LayoutProvider({ children }) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem('sidebar-collapsed')
      return stored ? JSON.parse(stored) : false
    } catch {
      return false
    }
  })

  // Persist sidebar collapsed status
  useEffect(() => {
    try {
      window.localStorage.setItem('sidebar-collapsed', JSON.stringify(isSidebarCollapsed))
    } catch (_e) {
      // ignore
    }
  }, [isSidebarCollapsed])

  // Close mobile drawer when resizing back to desktop screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 920) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const value = useMemo(() => ({
    isMobileMenuOpen,
    setMobileMenuOpen,
    toggleMobileMenu: () => setMobileMenuOpen((prev) => !prev),
    closeMobileMenu: () => setMobileMenuOpen(false),
    isSidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebarCollapse: () => setSidebarCollapsed((prev) => !prev),
  }), [isMobileMenuOpen, isSidebarCollapsed])

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
