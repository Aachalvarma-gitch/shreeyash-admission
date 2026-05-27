"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal } from "lucide-react";

import { useAuthStore } from "@/hooks/use-auth";
import { useGetInquiriesQuery, useUpdateInquiryMutation } from "@/lib/api/admin.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const statusFilters = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "READ", label: "Read" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REJECTED", label: "Rejected" },
];

const statusVariant = (status?: string) => {
  if (status === "REJECTED") return "destructive";
  if (status === "RESOLVED") return "default";
  return "secondary";
};

export default function AdminInquiriesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useGetInquiriesQuery({
    status: status === "all" ? undefined : status,
    page: 1,
    limit: 1000,
  });
  const [updateInquiry, { isLoading: isUpdating }] = useUpdateInquiryMutation();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  if (!isAuthenticated) return null;

  const inquiries = data?.data?.inquiries || [];
  const filtered = useMemo(
    () =>
      search
        ? inquiries.filter(
            (inq: any) =>
              inq.name?.toLowerCase().includes(search.toLowerCase()) ||
              inq.email?.toLowerCase().includes(search.toLowerCase()) ||
              inq.mobile?.includes(search)
          )
        : inquiries,
    [inquiries, search]
  );

  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const start = (page - 1) * ITEMS_PER_PAGE;
  const rows = filtered.slice(start, start + ITEMS_PER_PAGE);

  const setInquiryStatus = async (id: string, nextStatus: string) => {
    await updateInquiry({ id, status: nextStatus }).unwrap();
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Inquiries</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Search by name, email or mobile"
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
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading inquiries...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((inquiry: any) => (
                  <TableRow key={inquiry._id}>
                    <TableCell>{inquiry.name || "Unknown"}</TableCell>
                    <TableCell>
                      <div>{inquiry.email || "-"}</div>
                      <div className="text-xs text-muted-foreground">{inquiry.mobile || "-"}</div>
                    </TableCell>
                    <TableCell>{inquiry.subject || "-"}</TableCell>
                    <TableCell>{inquiry.message || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inquiry.status)}>{inquiry.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString("en-IN") : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {inquiry.status === "PENDING" ? (
                            <>
                              <DropdownMenuItem
                                disabled={isUpdating}
                                onClick={() => setInquiryStatus(inquiry._id, "READ")}
                              >
                                Mark Read
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isUpdating}
                                onClick={() => setInquiryStatus(inquiry._id, "REJECTED")}
                              >
                                Reject
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {inquiry.status !== "RESOLVED" && inquiry.status !== "REJECTED" ? (
                            <DropdownMenuItem
                              disabled={isUpdating}
                              onClick={() => setInquiryStatus(inquiry._id, "RESOLVED")}
                            >
                              Resolve
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <Card>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
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
