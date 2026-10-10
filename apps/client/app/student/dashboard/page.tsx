"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Edit, Eye, Loader2, XCircle } from "lucide-react";

import { useAuthStore } from "@/hooks/use-auth";
import { useGetMyApplicationQuery, useUpdateApplicationMutation } from "@/lib/api/student.api";
import { useShowToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const statusVariant = (status?: string) => {
  if (status === "REJECTED") return "destructive";
  if (status === "VERIFIED" || status === "ADMISSION_CONFIRMED") return "default";
  return "secondary";
};

const admissionTypeLabel = (type?: string) => {
  const map: Record<string, string> = {
    POLYTECHNIC: "Polytechnic",
    ENGINEERING_FIRST_YEAR: "Engineering First Year",
    DIRECT_SECOND_YEAR: "Direct Second Year (Legacy)",
    DIRECT_SECOND_YEAR_DIPLOMA: "DSE After Diploma",
    DIRECT_SECOND_YEAR_FE: "DSE After FE",
    COLLEGE_TRANSFER: "College Transfer",
    BRANCH_CHANGE: "Branch Change",
  };
  return type ? map[type] || type : "-";
};

export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuthStore();
  const { showToast } = useShowToast();

  // Wait for auth to finish loading from localStorage before proceeding
  if (authIsLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Card>
          <CardContent className="flex items-center gap-2 py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: applicationData, isLoading, refetch } = useGetMyApplicationQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [updateApplication, { isLoading: isUpdating }] = useUpdateApplicationMutation();

  const application = applicationData?.data?.application;

  const handleWithdrawApplication = async () => {
    if (!application) return;
    if (!confirm("Are you sure you want to withdraw your application?")) return;

    try {
      await updateApplication({ status: "DRAFT" }).unwrap();
      showToast({ title: "Application Withdrawn", description: "Your application was moved back to draft.", severity: "success" });
      refetch();
    } catch (error: any) {
      showToast({ title: "Error", description: error?.data?.message || "Failed to withdraw application", severity: "error" });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Student Dashboard</CardTitle>
            <CardDescription>Welcome, {user?.firstName}</CardDescription>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading application...
          </CardContent>
        </Card>
      ) : application ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your Application</span>
              <div className="flex gap-2">
                <Badge variant="outline">{admissionTypeLabel(application.admissionType)}</Badge>
                <Badge variant={statusVariant(application.status)}>
                  {application.status?.replace(/_/g, " ") || "N/A"}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardDescription>Application ID</CardDescription>
                  <CardTitle className="text-base">{application.applicationId || "-"}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Submitted On</CardDescription>
                  <CardTitle className="text-base">
                    {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString("en-IN") : "Not submitted"}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {application.allocatedCourse ? (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl text-blue-600">{'\u25CF'}</span>
                  <div>
                    <p className="font-semibold text-blue-800">Seat Confirmed</p>
                    <p className="text-sm text-blue-600">
                      Allocated: {(application.allocatedCourse as any)?.name || "Unknown course"}
                    </p>
                    <div className="text-xs text-blue-500 mt-1">
                      Admission Status: <Badge variant="default" className="bg-blue-100 text-blue-800">{application.status?.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : ['ENGINEERING_FIRST_YEAR', 'DIRECT_SECOND_YEAR_DIPLOMA', 'DIRECT_SECOND_YEAR_FE'].includes(application.admissionType || '') ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">First Priority</p>
                  <p className="font-medium">{(application.primaryCourse as any)?.name || "-"}</p>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Awaiting Allocation</Badge>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Second Priority</p>
                  <p className="font-medium">{(application.secondaryCourse as any)?.name || "Not selected"}</p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push("/student/my-application")}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              {(application.status === "DRAFT" || application.status === "SUBMITTED") && (
                <Button variant="outline" onClick={() => router.push("/student/application")}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Application
                </Button>
              )}
              {application.status === "SUBMITTED" && (
                <Button variant="destructive" onClick={handleWithdrawApplication} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Withdraw
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Application Found</CardTitle>
            <CardDescription>You have not submitted an application yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student/application">
              <Button>
                <BookOpen className="h-4 w-4 mr-2" />
                Apply Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/student/application">
            <Button variant="outline">Apply for Course</Button>
          </Link>
          <Link href="/student/contact">
            <Button variant="outline">Contact Support</Button>
          </Link>
          <Link href="/student/my-application">
            <Button variant="outline">View My Application</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
