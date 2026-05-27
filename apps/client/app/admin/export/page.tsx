"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuthStore } from "@/hooks/use-auth";
import { useExportApplicationsQuery, useExportInquiriesQuery } from "@/lib/api/admin.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

const APP_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "MERIT_LIST", label: "Merit List" },
  { value: "SEAT_ALLOCATED", label: "Seat Allocated" },
];

export default function AdminExportPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [appStatus, setAppStatus] = useState("all");
  const [inqStatus, setInqStatus] = useState("all");

  const { data: appData, isLoading: appLoading } = useExportApplicationsQuery({
    status: appStatus === "all" ? undefined : appStatus,
  });
  const { data: inqData, isLoading: inqLoading } = useExportInquiriesQuery({
    status: inqStatus === "all" ? undefined : inqStatus,
  });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const applications = appData?.data?.data || [];
  const inquiries = inqData?.data?.data || [];

  const downloadCSV = (data: any[], filename: string) => {
    if (!data?.length) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row: any) =>
      Object.values(row)
        .map((val: any) => {
          const str = val == null ? "" : String(val);
          return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadJSON = (data: any[], filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Applications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={appStatus} onChange={(e) => setAppStatus(e.target.value)}>
            {APP_STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </Select>
          <div className="text-sm text-muted-foreground">{applications.length} records</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadCSV(applications, "applications")} disabled={appLoading || !applications.length}>
              CSV
            </Button>
            <Button variant="outline" onClick={() => downloadJSON(applications, "applications")} disabled={appLoading || !applications.length}>
              JSON
            </Button>
            {appLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Inquiries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={inqStatus} onChange={(e) => setInqStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="PENDING">Pending</option>
            <option value="READ">Read</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
          <div className="text-sm text-muted-foreground">{inquiries.length} records</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadCSV(inquiries, "inquiries")} disabled={inqLoading || !inquiries.length}>
              CSV
            </Button>
            <Button variant="outline" onClick={() => downloadJSON(inquiries, "inquiries")} disabled={inqLoading || !inquiries.length}>
              JSON
            </Button>
            {inqLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
