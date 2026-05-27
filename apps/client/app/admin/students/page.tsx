"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuthStore } from "@/hooks/use-auth";
import {
  useDeleteUserMutation,
  useGetStudentsQuery,
  useToggleUserBlockMutation,
} from "@/lib/api/admin.api";
import { useShowToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusBadgeVariant = (status?: string) => {
  if (status === "REJECTED") return "destructive";
  if (status === "VERIFIED" || status === "ADMISSION_CONFIRMED") return "default";
  return "secondary";
};

export default function AdminStudentsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { showToast } = useShowToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, isLoading, refetch } = useGetStudentsQuery({
    page,
    limit: itemsPerPage,
    search: search || undefined,
  });

  const [deleteUser] = useDeleteUserMutation();
  const [toggleBlock] = useToggleUserBlockMutation();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (!isAuthenticated) return null;

  const students = data?.data?.students || [];
  const pagination = data?.data?.pagination || {};

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete student "${name}"?`)) return;
    try {
      await deleteUser(id).unwrap();
      showToast({ title: "Success", description: "Student deleted", severity: "success" });
      refetch();
    } catch (err: any) {
      showToast({ title: "Error", description: err?.data?.message || "Delete failed", severity: "error" });
    }
  };

  const handleToggleBlock = async (student: any) => {
    const action = student.isBlocked ? "unblock" : "block";
    if (!confirm(`${action} "${student.firstName} ${student.lastName}"?`)) return;
    try {
      await toggleBlock(student._id).unwrap();
      showToast({ title: "Success", description: `Student ${action}ed`, severity: "success" });
      refetch();
    } catch (err: any) {
      showToast({ title: "Error", description: err?.data?.message || "Update failed", severity: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={String(itemsPerPage)}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading students...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: any) => (
                  <TableRow key={student._id}>
                    <TableCell>{student.firstName} {student.lastName}</TableCell>
                    <TableCell>
                      <div>{student.email}</div>
                      <div className="text-xs text-muted-foreground">{student.mobile || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div>{student.application?.applicationId || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {student.application?.course || "No application"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.application?.status ? (
                        <Badge variant={statusBadgeVariant(student.application.status)}>
                          {student.application.status.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">-</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.createdAt ? new Date(student.createdAt).toLocaleDateString("en-IN") : "-"}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleToggleBlock(student)}>
                        {student.isBlocked ? "Unblock" : "Block"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(student._id, `${student.firstName} ${student.lastName}`)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination.pages > 1 ? (
        <Card>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
