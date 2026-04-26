import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  BookOpen, 
  UploadCloud, 
  Bookmark, 
  BarChart3, 
  Settings2, 
  Globe2, 
  ClipboardCheck, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useAuth } from '../../app/use-auth.js'
import { navItems } from './nav-config.js'

const iconMap = {
  LayoutDashboard,
  BookOpen,
  UploadCloud,
  Bookmark,
  BarChart3,
  Settings2,
  Globe2,
  ClipboardCheck,
  ShieldCheck
}

function SidebarContent({ isCollapsed, onToggleCollapse, isMobile = false, onItemClick }) {
  const { authState } = useAuth()
  const items = navItems.filter((item) => item.roles.includes(authState.role))

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && !isMobile && (
          <h2 className="text-lg font-semibold tracking-tight">Navigation</h2>
        )}
        {isMobile && (
          <h2 className="text-lg font-semibold tracking-tight">Menu</h2>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation Items */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          <TooltipProvider delayDuration={0}>
            {items.map((item) => {
              const IconComponent = iconMap[item.iconName]
              
              const navButton = (
                <Button
                  key={item.to}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-11 px-3",
                    isCollapsed && !isMobile && "px-2 justify-center"
                  )}
                  asChild
                >
                  <NavLink
                    to={item.to}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 transition-colors",
                        isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      )
                    }
                  >
                    {IconComponent && (
                      <IconComponent className="h-5 w-5 shrink-0" />
                    )}
                    {(!isCollapsed || isMobile) && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                </Button>
              )

              if (isCollapsed && !isMobile) {
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      {navButton}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return navButton
            })}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <div className={cn(
          "text-xs text-muted-foreground",
          isCollapsed && !isMobile && "text-center"
        )}>
          {(!isCollapsed || isMobile) ? (
            <>
              <p className="font-medium">Digital Knowledge Platform</p>
              <p>CSEDU © 2026</p>
            </>
          ) : (
            <p className="font-medium">DKP</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SidebarContent 
          isCollapsed={false} 
          isMobile={true}
          onItemClick={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}

export default function ModernSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col border-r bg-card transition-all duration-200 ease-in-out",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      <SidebarContent 
        isCollapsed={isCollapsed} 
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />
    </aside>
  )
}