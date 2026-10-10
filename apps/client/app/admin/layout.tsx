"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Bell, Moon, Settings, Sun } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/hooks/use-auth"
import { useGetStatsQuery } from "@/lib/api/admin.api"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const { user, logout, isAuthenticated } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const { data: statsData } = useGetStatsQuery(undefined, {
    skip: !hydrated || !isAuthenticated,
  })

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push("/login")
    }
  }, [hydrated, isAuthenticated, router])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!hydrated || !isAuthenticated) {
    return null
  }

  const stats = statsData?.data?.stats || {}
  const pendingInquiries = stats.pendingInquiries || 0

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <SidebarProvider>
      <AppSidebar
        userName={user?.firstName || "Admin"}
        roleName={(user as any)?.role?.name || "Admin"}
        pendingInquiries={pendingInquiries}
        stats={stats}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <header className="sticky top-0 z-20 border-b bg-background">
          <div className="flex items-center justify-between px-4 py-3">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4" />
                <Switch
                  checked={mounted && resolvedTheme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  aria-label="Toggle theme"
                />
                <Moon className="w-4 h-4" />
              </div>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Settings"
                onClick={() => router.push("/admin/settings")}
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="link" onClick={() => router.push("/student/dashboard")}>
                Student View
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
