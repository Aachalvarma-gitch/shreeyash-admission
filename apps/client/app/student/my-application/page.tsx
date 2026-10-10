"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuthStore } from "@/hooks/use-auth";
import { useGetMyApplicationQuery } from "@/lib/api/student.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export default function MyApplicationPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: applicationData, isLoading } = useGetMyApplicationQuery();
  const application: any = applicationData?.data?.application;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Application Found</CardTitle>
            <CardDescription>You have not submitted any application yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Link href="/student/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Link href="/student/application">
                <Button>Apply Now</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryCourseName =
    typeof application.primaryCourse === "object" ? application.primaryCourse?.name : application.primaryCourse;
  const secondaryCourseName =
    typeof application.secondaryCourse === "object" ? application.secondaryCourse?.name : application.secondaryCourse;
  const categoryName =
    typeof application.category === "object" ? application.category?.name : application.category;
  const category2Name =
    typeof application.category2 === "object" ? application.category2?.name : application.category2;
  const primaryCourse2Name =
    typeof application.primaryCourse2 === "object" ? application.primaryCourse2?.name : application.primaryCourse2;
  const secondaryCourse2Name =
    typeof application.secondaryCourse2 === "object" ? application.secondaryCourse2?.name : application.secondaryCourse2;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>My Application</CardTitle>
            <CardDescription>Application ID: {application.applicationId || "-"}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge>{admissionTypeLabel(application.admissionType)}</Badge>
            <Badge variant={statusVariant(application.status)}>{application.status?.replace(/_/g, " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/student/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          {(application.status === "DRAFT" || application.status === "SUBMITTED") && (
            <Link href="/student/application">
              <Button variant="outline">Edit Application</Button>
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Admission Type</TableCell>
                <TableCell><Badge>{admissionTypeLabel(application.admissionType)}</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>{application.name || "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>{application.email || "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Address</TableCell>
                <TableCell>{application.address || "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>10th Marks</TableCell>
                <TableCell>{application.tenthMarks ?? "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>12th Marks</TableCell>
                <TableCell>{application.twelfthMarks ?? "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>CET Score</TableCell>
                <TableCell>{application.cetScore ?? "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>JEE Score</TableCell>
                <TableCell>{application.jeeScore ?? "-"}</TableCell>
              </TableRow>
              {application.diplomaCollege && (
                <TableRow>
                  <TableCell>Diploma College</TableCell>
                  <TableCell>{application.diplomaCollege}</TableCell>
                </TableRow>
              )}
              {application.diplomaPercentage != null && (
                <TableRow>
                  <TableCell>Diploma Percentage</TableCell>
                  <TableCell>{application.diplomaPercentage}</TableCell>
                </TableRow>
              )}
              {application.transferType && (
                <TableRow>
                  <TableCell>Transfer Type</TableCell>
                  <TableCell>{application.transferType}</TableCell>
                </TableRow>
              )}
              {application.previousCollegeName && (
                <TableRow>
                  <TableCell>Previous College</TableCell>
                  <TableCell>{application.previousCollegeName}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>{categoryName || "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Primary Course</TableCell>
                <TableCell>{primaryCourseName || "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Secondary Course</TableCell>
                <TableCell>{secondaryCourseName || "-"}</TableCell>
              </TableRow>
              {category2Name && (
                <TableRow>
                  <TableCell>Section 2 Category</TableCell>
                  <TableCell>{category2Name}</TableCell>
                </TableRow>
              )}
              {primaryCourse2Name && (
                <TableRow>
                  <TableCell>Section 2 Primary Course</TableCell>
                  <TableCell>{primaryCourse2Name}</TableCell>
                </TableRow>
              )}
              {secondaryCourse2Name && (
                <TableRow>
                  <TableCell>Section 2 Secondary Course</TableCell>
                  <TableCell>{secondaryCourse2Name}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell>Submitted At</TableCell>
                <TableCell>
                  {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString("en-IN") : "Not submitted"}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Last Updated</TableCell>
                <TableCell>
                  {application.updatedAt ? new Date(application.updatedAt).toLocaleDateString("en-IN") : "-"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {['ENGINEERING_FIRST_YEAR', 'DIRECT_SECOND_YEAR_DIPLOMA', 'DIRECT_SECOND_YEAR_FE'].includes(application.admissionType || '') && (
        <Card>
          <CardHeader>
            <CardTitle>Seat Allocation Status</CardTitle>
            <CardDescription>Your priority-wise seat allocation details.</CardDescription>
          </CardHeader>
          <CardContent>
            {application.allocatedCourse ? (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl text-blue-600">{'\u25CF'}</span>
                  <div>
                    <p className="font-semibold text-blue-800">Seat Confirmed</p>
                    <p className="text-sm text-blue-600">
                      Allocated: {(application.allocatedCourse as any)?.name || "Unknown course"}
                    </p>
                    <div className="text-xs text-blue-500 mt-1">
                      Status: <Badge variant="default" className="bg-blue-100 text-blue-800">{application.status?.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-sm text-muted-foreground">First Priority</p>
                <p className="font-medium">{(application.primaryCourse as any)?.name || "-"}</p>
                <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                  {application.allocatedCourse ? (
                    (application.allocatedCourse as any)?._id === (application.primaryCourse as any)?._id ? "Allocated" : "Not Allocated"
                  ) : "Awaiting Allocation"}
                </Badge>
              </div>
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-sm text-muted-foreground">Second Priority</p>
                <p className="font-medium">{(application.secondaryCourse as any)?.name || "Not selected"}</p>
                {application.secondaryCourse && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                    {application.allocatedCourse ? (
                      (application.allocatedCourse as any)?._id === (application.secondaryCourse as any)?._id ? "Allocated" : "Not Allocated"
                    ) : "Awaiting Allocation"}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Uploaded documents for this application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {application.documents?.length ? (
            application.documents.map((doc: any, idx: number) => (
              <div key={`${doc.type}-${idx}`} className="flex items-center justify-between">
                <span>{String(doc.type || "Document").replace(/_/g, " ")}</span>
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">View</Button>
                </a>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
