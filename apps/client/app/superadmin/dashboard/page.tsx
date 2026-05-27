"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Users, BookOpen, MessageSquare, BarChart3, LogOut, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useAuthStore } from "@/hooks/use-auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<any>({
    totalStudents: 0,
    totalCourses: 0,
    totalAdmins: 0,
    pendingInquiries: 0,
    totalApplications: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role?.name !== "Super Admin") {
      router.push("/");
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const [coursesRes, inquiriesRes, adminRes, statsRes] = await Promise.all([
          api.get("/courses/courses", { signal: controller.signal }),
          api.get("/contact/inquiries/stats", { signal: controller.signal }),
          api.get("/superadmin/admins", { signal: controller.signal }),
          api.get("/admin/stats", { signal: controller.signal }),
        ]);
        
        if (!isMounted) return;
        
        setStats({
          totalCourses: coursesRes.data.data.pagination?.total || 0,
          pendingInquiries: inquiriesRes.data.data.stats?.pending || 0,
          totalAdmins: adminRes.data.data.admins?.length || adminRes.data.data?.length || 0,
          totalApplications: statsRes.data.data.stats?.totalApplications || 0,
        });
        setMonthlyStats(statsRes.data.data.monthlyStats || []);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isAuthenticated, user, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const menuItems = [
    { title: "Dashboard", icon: BarChart3, href: "/superadmin/dashboard", active: true },
    { title: "Courses", icon: BookOpen, href: "/superadmin/courses", active: false },
    { title: "Inquiries", icon: MessageSquare, href: "/superadmin/inquiries", active: false },
    { title: "Admins", icon: Users, href: "/superadmin/admins", active: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 relative">
              <Image
                src="https://syp.ac.in/images/logo/logo.png"
                alt="Shreeyash Pratishthan"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-bold text-gray-900">Super Admin</span>
          </Link>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                item.active
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.firstName}</p>
        </div>

         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-gray-500">Total Students</p>
                 <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
               </div>
               <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                 <Users className="w-6 h-6 text-green-600" />
               </div>
             </div>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-gray-500">Total Courses</p>
                 <p className="text-3xl font-bold text-gray-900">{stats.totalCourses}</p>
               </div>
               <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                 <BookOpen className="w-6 h-6 text-blue-600" />
               </div>
             </div>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-gray-500">Pending Inquiries</p>
                 <p className="text-3xl font-bold text-gray-900">{stats.pendingInquiries}</p>
               </div>
               <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                 <MessageSquare className="w-6 h-6 text-yellow-600" />
               </div>
             </div>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-gray-500">Total Applications</p>
                 <p className="text-3xl font-bold text-gray-900">{stats.totalApplications}</p>
               </div>
               <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                 <BarChart3 className="w-6 h-6 text-purple-600" />
               </div>
             </div>
           </div>
         </div>

         {/* Monthly Applications Chart */}
         {monthlyStats.length > 0 ? (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
             <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Applications (Last 6 Months)</h2>
             <div className="h-96 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={monthlyStats}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                   <YAxis tick={{ fontSize: 12 }} />
                   <Tooltip />
                   <Legend verticalAlign="top" height={36} />
                   <Bar dataKey="applications" name="Applications" barSize={20} fill="#3B82F6" />
                   <Bar dataKey="verified" name="Verified" barSize={20} fill="#10B981" />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
         ) : (
           <div className="flex items-center justify-center py-12">
             <Loader2 className="w-8 h-8 animate-spin text-green-600" />
           </div>
         )}

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/superadmin/courses"
              className="p-4 border border-gray-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition text-center"
            >
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <span className="text-sm font-medium">Manage Courses</span>
            </Link>
            <Link
              href="/superadmin/inquiries"
              className="p-4 border border-gray-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition text-center"
            >
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <span className="text-sm font-medium">Inquiries</span>
            </Link>
            <Link
              href="/superadmin/admins"
              className="p-4 border border-gray-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition text-center"
            >
              <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <span className="text-sm font-medium">Manage Admins</span>
            </Link>
            <Link
              href="/superadmin/settings"
              className="p-4 border border-gray-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition text-center"
            >
              <Settings className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}