"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import { useGetAuditLogsQuery } from "@/lib/api/admin.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ChevronLeft, ChevronRight, History, User, FileText, Settings, Trash2 } from "lucide-react";

const actionIcons: Record<string, any> = {
  CREATE: FileText,
  UPDATE: Settings,
  DELETE: Trash2,
  USER: User,
};

const actionColors: Record<string, string> = {
  CREATE: "text-green-500",
  UPDATE: "text-blue-500",
  DELETE: "text-red-500",
  BULK_UPDATE: "text-purple-500",
  PASSWORD_CHANGE: "text-orange-500",
};

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  
  const { data, isLoading, refetch } = useGetAuditLogsQuery({ 
    resource: resource || undefined,
    action: action || undefined, 
    page, 
    limit: 50 
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500">Track all admin actions (Super Admin only)</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <select
                value={resource}
                onChange={(e) => { setResource(e.target.value); setPage(1); }}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">All Resources</option>
                <option value="application">Application</option>
                <option value="user">User</option>
                <option value="inquiry">Inquiry</option>
                <option value="course">Course</option>
              </select>
              <select
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="BULK_UPDATE">Bulk Update</option>
                <option value="PASSWORD_CHANGE">Password Change</option>
              </select>
            </div>
            <Button variant="outline" onClick={() => { setResource(""); setAction(""); setPage(1); }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No audit logs found
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log: any) => {
                const Icon = actionIcons[log.action] || History;
                return (
                  <div key={log._id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${actionColors[log.action] || "bg-gray-100"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium capitalize">
                            {log.action?.toLowerCase().replace(/_/g, " ")}
                          </span>
                          <span className="text-gray-400">|</span>
                          <span className="text-sm text-gray-500 capitalize">
                            {log.resource}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>By: {log.user?.firstName} {log.user?.lastName}</span>
                          <span>{new Date(log.createdAt).toLocaleString("en-IN")}</span>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                            {JSON.stringify(log.details)}
                          </div>
                        )}
                        {log.ipAddress && (
                          <p className="text-xs text-gray-400 mt-1">IP: {log.ipAddress}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}