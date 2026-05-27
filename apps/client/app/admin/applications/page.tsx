"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";

import { useAuthStore } from "@/hooks/use-auth";
import { useBulkUpdateStatusMutation, useGetApplicationsQuery } from "@/lib/api/admin.api";
import { useGetCategoriesQuery, useGetCoursesQuery } from "@/lib/api/course.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_OPTIONS = [
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  "REVISION_REQUESTED",
  "MERIT_LIST",
  "SEAT_ALLOCATED",
  "FEE_PAID",
  "ADMISSION_CONFIRMED",
];

const statusFilters = [
  { value: "all", label: "All" },
  { value: "SUBMITTED", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "MERIT_LIST", label: "Merit" },
  { value: "SEAT_ALLOCATED", label: "Seat" },
];

const ADMISSION_TYPE_LABELS: Record<string, string> = {
  POLYTECHNIC: "Polytechnic",
  ENGINEERING_FIRST_YEAR: "Eng. First Year",
  DIRECT_SECOND_YEAR: "Direct SY",
  DIRECT_SECOND_YEAR_DIPLOMA: "DSY (Diploma)",
  DIRECT_SECOND_YEAR_FE: "DSY (FE)",
  COLLEGE_TRANSFER: "College Transfer",
  BRANCH_CHANGE: "Branch Change",
};

const admissionTypeFilters = [
  { value: "all", label: "All Types" },
  { value: "POLYTECHNIC", label: "Polytechnic" },
  { value: "ENGINEERING_FIRST_YEAR", label: "Engineering First Year" },
  { value: "DIRECT_SECOND_YEAR", label: "Direct Second Year" },
  { value: "DIRECT_SECOND_YEAR_DIPLOMA", label: "DSY (After Diploma)" },
  { value: "DIRECT_SECOND_YEAR_FE", label: "DSY (After FE)" },
  { value: "COLLEGE_TRANSFER", label: "College Transfer" },
  { value: "BRANCH_CHANGE", label: "Branch Change" },
];

const admissionTypeBadgeClass = (type?: string) => {
  switch (type) {
    case "POLYTECHNIC": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "ENGINEERING_FIRST_YEAR": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "DIRECT_SECOND_YEAR":
    case "DIRECT_SECOND_YEAR_DIPLOMA": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "DIRECT_SECOND_YEAR_FE": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "COLLEGE_TRANSFER": return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
    case "BRANCH_CHANGE": return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
};

const statusBadgeVariant = (status?: string) => {
  if (status === "REJECTED") return "destructive";
  if (status === "VERIFIED" || status === "ADMISSION_CONFIRMED") return "default";
  return "secondary";
};

export default function AdminApplicationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [admissionTypeFilter, setAdmissionTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");

  const { data: categoriesData } = useGetCategoriesQuery();
  const categories = categoriesData?.data?.categories || [];
  const { data: coursesData } = useGetCoursesQuery(
    categoryFilter === "all" ? undefined : { category: categoryFilter }
  );
  const courses = coursesData?.data?.courses || [];

  const { data, isLoading, refetch } = useGetApplicationsQuery({
    status: status === "all" ? undefined : status,
    page,
    limit: itemsPerPage,
    search: search || undefined,
  });
  const [bulkUpdate, { isLoading: isBulkUpdating }] = useBulkUpdateStatusMutation();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    setCourseFilter("all");
  }, [categoryFilter]);

  if (!isAuthenticated) return null;

  const applications = data?.data?.applications || [];
  const pagination = data?.data?.pagination || {};
  const visibleApps = useMemo(
    () =>
      applications.filter((app: any) => {
        if (categoryFilter !== "all" && app.category?._id !== categoryFilter) return false;
        if (courseFilter !== "all" && app.primaryCourse?._id !== courseFilter) return false;
        if (admissionTypeFilter !== "all" && app.admissionType !== admissionTypeFilter) return false;
        return true;
      }),
    [applications, categoryFilter, courseFilter, admissionTypeFilter]
  );

  const allIds = visibleApps.map((app: any) => app._id);
  const allSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : allIds);
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    await bulkUpdate({ applicationIds: selectedIds, status: bulkStatus }).unwrap();
    setShowBulkModal(false);
    setSelectedIds([]);
    setBulkStatus("");
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
          <Input
            placeholder="Search by name, email or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </Select>
          <Select value={admissionTypeFilter} onChange={(e) => setAdmissionTypeFilter(e.target.value)}>
            {admissionTypeFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((cat: any) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </Select>
          <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="all">All Courses</option>
            {courses.map((course: any) => (
              <option key={course._id} value={course._id}>
                {course.name}
              </option>
            ))}
          </Select>
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
          <Button onClick={() => setShowBulkModal(true)} disabled={selectedIds.length === 0}>
            Bulk Update ({selectedIds.length})
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading applications...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleApps.map((app: any) => (
                  <TableRow key={app._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(app._id)}
                        onCheckedChange={() => toggleSelectOne(app._id)}
                      />
                    </TableCell>
                    <TableCell>{app.applicationId}</TableCell>
                    <TableCell>
                      <div>{app.name}</div>
                      <div className="text-xs text-muted-foreground">{app.email}</div>
                    </TableCell>
                    <TableCell>
                      <div>{app.primaryCourse?.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {app.secondaryCourse?.name ? `Alt: ${app.secondaryCourse.name}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${admissionTypeBadgeClass(app.admissionType)}`}>
                        {ADMISSION_TYPE_LABELS[app.admissionType as string] || app.admissionType || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(app.status)}>
                        {app.status?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "-"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/applications/${app._id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
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

      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Update Status</DialogTitle>
            <DialogDescription>
              Update {selectedIds.length} application{selectedIds.length === 1 ? "" : "s"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
              <option value="">Select status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={!bulkStatus || isBulkUpdating}>
              {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
