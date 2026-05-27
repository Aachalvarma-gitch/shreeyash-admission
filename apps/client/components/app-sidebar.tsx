"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CheckCircle,
  Clock,
  Download,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  MessageSquare,
  Settings,
  UserPlus,
  Users,
  TicketCheck,
  type LucideIcon,
} from "lucide-react"
import { NavUser } from "@/components/nav-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

type AdminSidebarItem = {
  href: string
  label: string
  icon: LucideIcon
  showBadge?: boolean
}

type AppSidebarProps = {
  userName: string
  roleName: string
  pendingInquiries: number
  stats: {
    totalApplications?: number
    pendingApplications?: number
    verifiedApplications?: number
    totalInquiries?: number
  }
  onLogout: () => void
}

const navItems: AdminSidebarItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare, showBadge: true },
  { href: "/admin/courses", label: "Courses", icon: GraduationCap },
  { href: "/admin/admission-types", label: "Admission Types", icon: TicketCheck },
  { href: "/admin/users", label: "Users", icon: UserPlus },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: History },
  { href: "/admin/export", label: "Export Data", icon: Download },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AppSidebar({
  userName,
  roleName,
  pendingInquiries,
  stats,
  onLogout,
  ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg border">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Admin Panel</span>
                  <span className="truncate text-xs">{roleName}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <FileText />
                  <span>Applications</span>
                  <SidebarMenuBadge>{stats.totalApplications || 0}</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Clock />
                  <span>Pending</span>
                  <SidebarMenuBadge>{stats.pendingApplications || 0}</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <CheckCircle />
                  <span>Verified</span>
                  <SidebarMenuBadge>{stats.verifiedApplications || 0}</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <MessageSquare />
                  <span>Inquiries</span>
                  <SidebarMenuBadge>{stats.totalInquiries || 0}</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const showBadge = item.showBadge && pendingInquiries > 0

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {showBadge ? <SidebarMenuBadge>{pendingInquiries}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            name: userName,
            email: roleName,
            avatar: "",
          }}
          onLogout={onLogout}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
