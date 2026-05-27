"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User } from "lucide-react"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/hooks/use-auth"
import { StudentSidebar } from "@/components/student-sidebar"

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!mounted) {
    return <>{children}</>
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <SidebarProvider>
      <StudentSidebar
        userName={user?.firstName || "Student"}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.firstName}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}