"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/hooks/use-auth";
import { useAllocateSeatMutation, useGetApplicationByIdQuery, useGetSeatStatusQuery, useUpdateApplicationStatusMutation, useUploadDocumentMutation } from "@/lib/api/admin.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Loader2, ArrowLeft, ExternalLink, User, GraduationCap, FileText, Upload } from "lucide-react";

const statusOptions = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "REVISION_REQUESTED", label: "Revision Requested" },
  { value: "MERIT_LIST", label: "Merit List" },
  { value: "SEAT_ALLOCATED", label: "Seat Allocated" },
  { value: "FEE_PAID", label: "Fee Paid" },
  { value: "ADMISSION_CONFIRMED", label: "Admission Confirmed" },
];

const statusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "VERIFIED":
    case "ADMISSION_CONFIRMED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "MERIT_LIST":
    case "SEAT_ALLOCATED":
    case "FEE_PAID":
      return "secondary";
    default:
      return "outline";
  }
};

const DOC_LABELS: Record<string, string> = {
  tenth_marksheet: "10th Marksheet",
  twelfth_marksheet: "12th Marksheet",
  cet_result: "CET Scorecard",
  jee_result: "JEE Scorecard",
  photo: "Photo",
  leaving_certificate: "Leaving Certificate",
  aadhaar_card: "Aadhaar Card",
  passport_photo: "Passport Photo",
  cet_jee_scorecard: "CET/JEE Scorecard",
  diploma_marksheet: "Diploma Marksheet",
  diploma_result: "Diploma Result",
  diploma_certificate: "Diploma Certificate",
  previous_college_bonafide: "Previous College Bonafide",
  previous_year_marksheet: "Previous Year Marksheet",
  transfer_certificate: "Transfer Certificate",
  migration_certificate: "Migration Certificate",
  fee_receipt: "Fee Receipt",
  first_year_marksheet: "First Year Marksheet",
};

const ADMISSION_TYPE_LABELS: Record<string, string> = {
  POLYTECHNIC: "Polytechnic",
  ENGINEERING_FIRST_YEAR: "Engineering First Year",
  DIRECT_SECOND_YEAR: "Direct Second Year",
  DIRECT_SECOND_YEAR_DIPLOMA: "DSY (After Diploma)",
  DIRECT_SECOND_YEAR_FE: "DSY (After First Year)",
  COLLEGE_TRANSFER: "College Transfer",
  BRANCH_CHANGE: "Branch Change",
};

const ADMISSION_TYPE_REQUIRED_DOCS: Record<string, string[]> = {
  POLYTECHNIC: ["tenth_marksheet", "leaving_certificate", "photo", "aadhaar_card"],
  ENGINEERING_FIRST_YEAR: ["tenth_marksheet", "twelfth_marksheet", "cet_result", "leaving_certificate", "photo", "aadhaar_card"],
  DIRECT_SECOND_YEAR: ["diploma_marksheet", "diploma_certificate", "migration_certificate", "tenth_marksheet", "photo", "aadhaar_card", "leaving_certificate"],
  DIRECT_SECOND_YEAR_DIPLOMA: ["diploma_marksheet", "diploma_certificate", "migration_certificate", "tenth_marksheet", "photo", "aadhaar_card", "leaving_certificate"],
  DIRECT_SECOND_YEAR_FE: ["first_year_marksheet", "previous_college_bonafide", "leaving_certificate", "tenth_marksheet", "twelfth_marksheet", "cet_result", "photo", "aadhaar_card"],
  COLLEGE_TRANSFER: ["previous_college_bonafide", "previous_year_marksheet", "transfer_certificate", "tenth_marksheet", "twelfth_marksheet", "photo", "aadhaar_card", "leaving_certificate"],
  BRANCH_CHANGE: ["previous_year_marksheet", "fee_receipt", "tenth_marksheet", "twelfth_marksheet", "photo", "aadhaar_card"],
};

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

export default function AdminApplicationReviewPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAuthStore();
  const applicationId = params.id as string;

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectedReason, setRejectedReason] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState("");

  const { data, isLoading, refetch } = useGetApplicationByIdQuery(applicationId);
  const [updateStatus, { isLoading: isUpdating }] = useUpdateApplicationStatusMutation();
  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleUpdateStatus = async () => {
    try {
      await updateStatus({
        id: applicationId,
        status: newStatus,
        reviewNotes: reviewNotes || undefined,
        rejectedReason: rejectedReason || undefined,
      }).unwrap();
      setShowStatusModal(false);
      setNewStatus("");
      setReviewNotes("");
      setRejectedReason("");
      refetch();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!file) return;
    setUploadingDoc(documentType);
    try {
      await uploadDocument({ id: applicationId, documentType, file }).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to upload document:", err);
    } finally {
      setUploadingDoc("");
    }
  };

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
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const application = data?.data?.application;

  if (!application) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Application Not Found</CardTitle>
            <CardDescription>The requested application could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/applications">
              <Button>Back to Applications</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/applications">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Application Review</h1>
            <p className="text-muted-foreground">ID: {application.applicationId}</p>
          </div>
        </div>
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogTrigger asChild>
            <Button>Update Status</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Application Status</DialogTitle>
              <DialogDescription>
                Change the status of this application. The applicant will be notified of the change.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="">Select status</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              {(newStatus === "REVISION_REQUESTED" || newStatus === "REJECTED") && (
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={rejectedReason}
                    onChange={(e) => setRejectedReason(e.target.value)}
                    placeholder="Enter reason for rejection or revision..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Internal Notes (optional)</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add internal notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleUpdateStatus} disabled={!newStatus || isUpdating}>
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>
              Submitted on {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString("en-IN") : "Not submitted"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${admissionTypeBadgeClass(application.admissionType)}`}>
              {ADMISSION_TYPE_LABELS[application.admissionType as string] || application.admissionType || "-"}
            </span>
            <Badge variant={statusVariant(application.status)}>
              {application.status?.replace(/_/g, " ")}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Full Name</TableCell>
                  <TableCell>{application.name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Email</TableCell>
                  <TableCell>{application.email}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Address</TableCell>
                  <TableCell>{application.address}</TableCell>
                </TableRow>
                {application.user && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium">User</TableCell>
                      <TableCell>
                        {application.user.firstName} {application.user.lastName}
                        <br />
                        <span className="text-muted-foreground text-sm">{application.user.email}</span>
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Academic Details
              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${admissionTypeBadgeClass(application.admissionType)}`}>
                {ADMISSION_TYPE_LABELS[application.admissionType as string] || application.admissionType || "-"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">10th Marks</TableCell>
                  <TableCell>{application.tenthMarks != null ? `${application.tenthMarks}%` : "-"}</TableCell>
                </TableRow>

                {["ENGINEERING_FIRST_YEAR", "DIRECT_SECOND_YEAR_FE", "COLLEGE_TRANSFER", "BRANCH_CHANGE"].includes(application.admissionType) && (
                  <TableRow>
                    <TableCell className="font-medium">12th Marks</TableCell>
                    <TableCell>{application.twelfthMarks != null ? `${application.twelfthMarks}%` : "-"}</TableCell>
                  </TableRow>
                )}

                {["ENGINEERING_FIRST_YEAR", "DIRECT_SECOND_YEAR_FE", "BRANCH_CHANGE"].includes(application.admissionType) && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium">CET Score</TableCell>
                      <TableCell>
                        <span className={application.cetScore >= 100 ? "text-green-600 font-semibold" : ""}>
                          {application.cetScore || "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">JEE Score</TableCell>
                      <TableCell>{application.jeeScore || "-"}</TableCell>
                    </TableRow>
                  </>
                )}

                {["DIRECT_SECOND_YEAR", "DIRECT_SECOND_YEAR_DIPLOMA"].includes(application.admissionType) && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium">Diploma College</TableCell>
                      <TableCell>{application.diplomaCollege || "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Diploma CGPA</TableCell>
                      <TableCell>{application.diplomaCgpa || "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Diploma Percentage</TableCell>
                      <TableCell>{application.diplomaPercentage != null ? `${application.diplomaPercentage}%` : "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Year of Passing</TableCell>
                      <TableCell>{application.diplomaYearOfPassing || "-"}</TableCell>
                    </TableRow>
                  </>
                )}

                {["COLLEGE_TRANSFER", "BRANCH_CHANGE", "DIRECT_SECOND_YEAR_FE"].includes(application.admissionType) && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium">Previous College</TableCell>
                      <TableCell>{application.previousCollegeName || "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Previous College Address</TableCell>
                      <TableCell>{application.previousCollegeAddress || "-"}</TableCell>
                    </TableRow>
                  </>
                )}

                {["COLLEGE_TRANSFER", "BRANCH_CHANGE"].includes(application.admissionType) && (
                  <TableRow>
                    <TableCell className="font-medium">Transfer Type</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{application.transferType || "-"}</Badge>
                    </TableCell>
                  </TableRow>
                )}

                {application.meritRank != null && (
                  <TableRow>
                    <TableCell className="font-medium">Merit Rank</TableCell>
                    <TableCell>
                      <span className="font-bold text-lg">#{application.meritRank}</span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Course Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardDescription>Primary Preference</CardDescription>
                  <CardTitle className="text-lg">{application.primaryCourse?.name || "-"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Code: {application.primaryCourse?.code}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Secondary Preference</CardDescription>
                  <CardTitle className="text-lg">{application.secondaryCourse?.name || "-"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Code: {application.secondaryCourse?.code}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {['ENGINEERING_FIRST_YEAR', 'DIRECT_SECOND_YEAR_DIPLOMA', 'DIRECT_SECOND_YEAR_FE'].includes(application.admissionType) && (
          <SeatAllocationCard application={application} onAllocated={refetch} />
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents Checklist
            </CardTitle>
            <CardDescription>
              Required documents for {ADMISSION_TYPE_LABELS[application.admissionType as string] || application.admissionType || "this admission type"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(ADMISSION_TYPE_REQUIRED_DOCS[application.admissionType as string] || []).map((type: string) => {
                const doc = application.documents?.find((d: any) => d.type === type);
                const label = DOC_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <Card key={type} className={doc?.url ? "border-green-300 dark:border-green-700" : "border-red-300 dark:border-red-700"}>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardDescription className="text-xs">{label}</CardDescription>
                      {doc?.url ? (
                        <span className="text-green-600 text-xs font-medium">✓</span>
                      ) : (
                        <span className="text-red-500 text-xs font-medium">✗</span>
                      )}
                    </CardHeader>
                    <CardContent>
                      {doc?.url ? (
                        <div className="flex flex-col gap-2">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                            <ExternalLink className="w-3 h-3" />
                            View
                          </a>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(type, file);
                              }}
                              disabled={!!uploadingDoc}
                            />
                            <span className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              {uploadingDoc === type ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                              Replace
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-muted-foreground font-medium">Missing</p>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(type, file);
                              }}
                              disabled={!!uploadingDoc}
                            />
                            <span className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              {uploadingDoc === type ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                              Upload
                            </span>
                          </label>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {(ADMISSION_TYPE_REQUIRED_DOCS[application.admissionType as string] || []).length === 0 && (
              <p className="text-muted-foreground text-sm">No required documents defined for this admission type.</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Status History</CardTitle>
            <CardDescription>Timeline of status changes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {application.statusHistory?.slice().reverse().map((history: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant={statusVariant(history.status)}>
                        {history.status?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(history.changedAt).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-muted-foreground">{history.reason || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SeatAllocationCard({ application, onAllocated }: { application: any; onAllocated: () => void }) {
  const [allocateSeat, { isLoading: isAllocating }] = useAllocateSeatMutation();
  const { data: seatStatusData } = useGetSeatStatusQuery();
  const seatStatusMap = new Map<string, string>();
  (seatStatusData?.data?.seatStatuses || []).forEach((ss: any) => {
    seatStatusMap.set(ss._id, ss.status);
  });

  const priStatus = seatStatusMap.get(application.primaryCourse?._id);
  const secStatus = seatStatusMap.get(application.secondaryCourse?._id);
  const isAllocated = !!application.allocatedCourse;

  const seatBadge = (status?: string) => {
    switch (status) {
      case "available": return <Badge className="bg-green-100 text-green-800 border-green-200">Available</Badge>;
      case "limited": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Limited</Badge>;
      case "full": return <Badge className="bg-red-100 text-red-800 border-red-200">Full</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleAllocate = async (priority: string, courseId: string) => {
    try {
      await allocateSeat({ id: application._id, priority, courseId }).unwrap();
      onAllocated();
    } catch (err: any) {
      alert(err?.data?.error || err?.data?.message || "Allocation failed");
    }
  };

  return (
    <Card className="md:col-span-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          Seat Allocation
        </CardTitle>
        <CardDescription>Manage seat assignment for this application</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAllocated ? (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
            <span className="text-blue-600 text-lg">{'\u25CF'}</span>
            <div>
              <p className="font-semibold text-blue-800">Seat Confirmed</p>
              <p className="text-sm text-blue-600">
                Allocated: {(application.allocatedCourse as any)?.name || "Unknown course"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">First Priority</p>
                <p className="text-sm">{application.primaryCourse?.name || "-"}</p>
                <div>{seatBadge(priStatus)}</div>
                {(priStatus === "available" || priStatus === "limited") && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleAllocate("primary", application.primaryCourse?._id)}
                    disabled={isAllocating}
                  >
                    {isAllocating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Allocate First Priority
                  </Button>
                )}
                {priStatus === "full" && <p className="text-xs text-red-600">No seats available</p>}
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">Second Priority</p>
                <p className="text-sm">{application.secondaryCourse?.name || "-"}</p>
                <div>{seatBadge(secStatus)}</div>
                {(secStatus === "available" || secStatus === "limited") && (
                  <Button
                    size="sm"
                    className="bg-yellow-600 hover:bg-yellow-700"
                    onClick={() => handleAllocate("secondary", application.secondaryCourse?._id)}
                    disabled={isAllocating}
                  >
                    {isAllocating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Allocate Second Priority
                  </Button>
                )}
                {secStatus === "full" && <p className="text-xs text-red-600">No seats available</p>}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => alert("Waitlist logic goes here")}>
                Put on Waiting List
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
