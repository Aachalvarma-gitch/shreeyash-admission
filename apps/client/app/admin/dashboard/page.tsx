"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import { useGetStatsQuery, useSeedDataMutation } from "@/lib/api/admin.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  FileText,
  Loader2,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { data, isLoading, refetch } = useGetStatsQuery();
  const [seedData, { isLoading: isSeeding }] = useSeedDataMutation();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = data?.data?.stats || {};
  const recentApps = data?.data?.recentApplications || [];
  const monthlyStats = data?.data?.monthlyStats || [];

  const handleSeedData = async () => {
    if (confirm("This will create sample data. Continue?")) {
      try {
        await seedData().unwrap();
        alert("Sample data created successfully!");
        refetch();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to create sample data");
      }
    }
  };

  const totalApps = stats.totalApplications || 0;
  const pendingPct =
    totalApps > 0 ? Math.round((stats.pendingApplications / totalApps) * 100) : 0;
  const verifiedPct =
    totalApps > 0 ? Math.round((stats.verifiedApplications / totalApps) * 100) : 0;
  const rejectedPct =
    totalApps > 0 ? Math.round((stats.rejectedApplications / totalApps) * 100) : 0;

  const topStats = [
    {
      title: "Total Applications",
      value: stats.totalApplications || 0,
      description: "All submissions received",
      icon: FileText,
    },
    {
      title: "Pending Review",
      value: stats.pendingApplications || 0,
      description: `${pendingPct}% of total`,
      icon: Clock,
    },
    {
      title: "Verified",
      value: stats.verifiedApplications || 0,
      description: `${verifiedPct}% of total`,
      icon: CheckCircle,
    },
    {
      title: "Inquiries",
      value: stats.totalInquiries || 0,
      description: `${stats.pendingInquiries || 0} pending`,
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Welcome back, {user?.firstName}.{" "}
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topStats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4" />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Application Trends
            </CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyStats.length > 0 ? (
              <ul className="space-y-2">
                {monthlyStats.map((month: any) => (
                  <li
                    key={month.month}
                    className="flex items-center justify-between border rounded-md p-3"
                  >
                    <span>{month.month}</span>
                    <span>{month.applications || 0}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Status Breakdown
            </CardTitle>
            <CardDescription>Application workflow summary</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center justify-between border rounded-md p-3">
                <span>Pending</span>
                <span>
                  {stats.pendingApplications || 0} ({pendingPct}%)
                </span>
              </li>
              <li className="flex items-center justify-between border rounded-md p-3">
                <span>Verified</span>
                <span>
                  {stats.verifiedApplications || 0} ({verifiedPct}%)
                </span>
              </li>
              <li className="flex items-center justify-between border rounded-md p-3">
                <span>Rejected</span>
                <span>
                  {stats.rejectedApplications || 0} ({rejectedPct}%)
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Applications</CardTitle>
          <Link href="/admin/applications">
            <Button variant="outline" size="sm">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentApps.length === 0 ? (
            <p>No applications yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Course</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApps.map((app: any) => (
                    <tr key={app._id}>
                      <td className="p-2">{app.applicationId}</td>
                      <td className="p-2">
                        <div>{app.name}</div>
                        <div>{app.email}</div>
                      </td>
                      <td className="p-2">{app.primaryCourse?.name || "-"}</td>
                      <td className="p-2">{app.status?.replace(/_/g, " ")}</td>
                      <td className="p-2">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription>Create sample records</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSeedData} disabled={isSeeding} variant="outline">
              <Database className="h-4 w-4 mr-2" />
              {isSeeding ? "Creating..." : "Generate Sample Data"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>Review and manage applications</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/applications">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Open Applications
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>{stats.totalStudents || 0} registered</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/students">
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Open Students
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Navigation</CardTitle>
          <CardDescription>Common admin shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/admin/inquiries">
            <Button variant="ghost">Inquiries</Button>
          </Link>
          <Link href="/admin/courses">
            <Button variant="ghost">Courses</Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="ghost">Users</Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="ghost">Settings</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
