"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Upload } from "lucide-react";

import { useAuthStore } from "@/hooks/use-auth";
import { useShowToast } from "@/components/ui/toast";
import {
  useCreateApplicationMutation,
  useGetCategoriesQuery,
  useGetCoursesQuery,
  useGetMyApplicationQuery,
  useUpdateApplicationMutation,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
  useGetAdmissionTypesQuery,
} from "@/lib/api/student.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type AdmissionTypeOption = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  requiredDocuments: string[];
  optionalDocuments?: string[];
};

const FALLBACK_ADMISSION_TYPES: AdmissionTypeOption[] = [
  { _id: 'polytechnic', name: 'Polytechnic', slug: 'polytechnic', description: 'Admission to Polytechnic diploma programs after 10th', requiredDocuments: ['tenth_marksheet', 'leaving_certificate'] },
  { _id: 'engineering_first_year', name: 'Engineering First Year', slug: 'engineering_first_year', description: 'Admission to First Year Engineering after 12th (HSC)', requiredDocuments: ['tenth_marksheet', 'twelfth_marksheet', 'cet_result', 'leaving_certificate'] },
  { _id: 'direct_second_year', name: 'Direct Second Year', slug: 'direct_second_year', description: 'Direct admission to Second Year Engineering after diploma', requiredDocuments: ['diploma_marksheet', 'diploma_certificate', 'migration_certificate'] },
  { _id: 'direct_second_year_diploma', name: 'Direct Second Year (After Diploma)', slug: 'direct_second_year_diploma', description: 'Direct admission to Second Year Engineering after completing Diploma/Polytechnic', requiredDocuments: ['diploma_marksheet', 'diploma_certificate', 'migration_certificate'] },
  { _id: 'direct_second_year_fe', name: 'Direct Second Year (After First Year)', slug: 'direct_second_year_fe', description: 'Direct admission to Second Year Engineering after completing First Year Engineering', requiredDocuments: ['first_year_marksheet', 'previous_college_bonafide', 'leaving_certificate'] },
  { _id: 'college_transfer', name: 'College Transfer', slug: 'college_transfer', description: 'Transfer from another college/institution', requiredDocuments: ['previous_college_bonafide', 'previous_year_marksheet', 'transfer_certificate'] },
  { _id: 'branch_change', name: 'Branch Change', slug: 'branch_change', description: 'Change of branch within the same college', requiredDocuments: ['previous_year_marksheet', 'fee_receipt'] },
];

const admissionTypeFields: Record<string, { label: string; fields: { key: string; label: string; type: string; placeholder?: string }[] }> = {
  POLYTECHNIC: {
    label: "Polytechnic",
    fields: [
      { key: "tenthMarks", label: "10th Marks (%)", type: "number" },
    ],
  },
  ENGINEERING_FIRST_YEAR: {
    label: "Engineering First Year",
    fields: [
      { key: "tenthMarks", label: "10th Marks (%)", type: "number" },
      { key: "twelfthMarks", label: "12th Marks (%)", type: "number" },
      { key: "cetScore", label: "CET Score", type: "number" },
      { key: "jeeScore", label: "JEE Score (optional)", type: "number" },
    ],
  },
  DIRECT_SECOND_YEAR: {
    label: "Direct Second Year",
    fields: [
      { key: "diplomaCollege", label: "Diploma College Name", type: "text" },
      { key: "diplomaCgpa", label: "Diploma CGPA", type: "number" },
      { key: "diplomaPercentage", label: "Diploma Percentage (%)", type: "number" },
      { key: "diplomaYearOfPassing", label: "Diploma Year of Passing", type: "number" },
    ],
  },
  DIRECT_SECOND_YEAR_DIPLOMA: {
    label: "Direct Second Year (After Diploma)",
    fields: [
      { key: "diplomaCollege", label: "Diploma College Name", type: "text" },
      { key: "diplomaCgpa", label: "Diploma CGPA", type: "number" },
      { key: "diplomaPercentage", label: "Diploma Percentage (%)", type: "number" },
      { key: "diplomaYearOfPassing", label: "Diploma Year of Passing", type: "number" },
    ],
  },
  DIRECT_SECOND_YEAR_FE: {
    label: "Direct Second Year (After First Year)",
    fields: [
      { key: "previousCollegeName", label: "First Year College Name", type: "text" },
      { key: "previousCollegeAddress", label: "First Year College Address", type: "text" },
    ],
  },
  COLLEGE_TRANSFER: {
    label: "College Transfer",
    fields: [
      { key: "transferType", label: "Transfer Type", type: "select", placeholder: "Select transfer type" },
      { key: "previousCollegeName", label: "Previous College Name", type: "text" },
      { key: "previousCollegeAddress", label: "Previous College Address", type: "text" },
    ],
  },
  BRANCH_CHANGE: {
    label: "Branch Change",
    fields: [
      { key: "transferType", label: "Transfer Type", type: "select", placeholder: "Select transfer type" },
      { key: "previousCollegeName", label: "Current College Name", type: "text" },
      { key: "previousCollegeAddress", label: "Current College Address", type: "text" },
    ],
  },
};

const docLabel: Record<string, string> = {
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

const ADMISSION_TYPE_DOMAINS: Record<string, string[]> = {
  POLYTECHNIC: ['mechanical', 'civil', 'electrical', 'electronics'],
  ENGINEERING_FIRST_YEAR: ['computing', 'mechanical', 'civil', 'electrical', 'electronics'],
  DIRECT_SECOND_YEAR: ['computing', 'mechanical', 'civil', 'electrical', 'electronics'],
  DIRECT_SECOND_YEAR_DIPLOMA: ['computing', 'mechanical', 'civil', 'electrical', 'electronics'],
  DIRECT_SECOND_YEAR_FE: ['computing', 'mechanical', 'civil', 'electrical', 'electronics'],
  COLLEGE_TRANSFER: ['computing', 'mechanical', 'civil', 'electrical', 'electronics', 'commerce', 'arts', 'pharmacy', 'management', 'science'],
  BRANCH_CHANGE: ['computing', 'mechanical', 'civil', 'electrical', 'electronics', 'commerce', 'arts', 'pharmacy', 'management', 'science'],
};

export default function ApplicationPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { showToast } = useShowToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [maxAccessedStep, setMaxAccessedStep] = useState(0);
  const [admissionType, setAdmissionType] = useState("");
  const [category, setCategory] = useState("");
  const [primaryCourse, setPrimaryCourse] = useState("");
  const [secondaryCourse, setSecondaryCourse] = useState("");
  const [previousCategory, setPreviousCategory] = useState("");
  const [category2, setCategory2] = useState("");
  const [primaryCourse2, setPrimaryCourse2] = useState("");
  const [secondaryCourse2, setSecondaryCourse2] = useState("");
  const [uploaded, setUploaded] = useState<Record<string, { url: string; publicId: string }>>({});
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({
    name: "",
    email: "",
    address: "",
    tenthMarks: "",
    twelfthMarks: "",
    cetScore: "",
    jeeScore: "",
    diplomaCollege: "",
    diplomaCgpa: "",
    diplomaPercentage: "",
    diplomaYearOfPassing: "",
    transferType: "",
    previousCollegeName: "",
    previousCollegeAddress: "",
    previousCategory: "",
  });

  // Reset category and course selections when admission type changes
  useEffect(() => {
    setCategory("");
    setPrimaryCourse("");
    setSecondaryCourse("");
    setCategory2("");
    setPrimaryCourse2("");
    setSecondaryCourse2("");
    // Reset form data that depends on admission type
    setFormData(prev => ({
      ...prev,
      tenthMarks: "",
      twelfthMarks: "",
      cetScore: "",
      jeeScore: "",
      diplomaCollege: "",
      diplomaCgpa: "",
      diplomaPercentage: "",
      diplomaYearOfPassing: "",
      transferType: "",
      previousCollegeName: "",
      previousCollegeAddress: "",
      previousCategory: "",
    }));
  }, [admissionType]);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: admissionTypesData } = useGetAdmissionTypesQuery();
  const { data: appData, isLoading: isAppLoading } = useGetMyApplicationQuery();
  const existing: any = appData?.data?.application;
  const isEditing = !!existing;

  const { data: categoriesData } = useGetCategoriesQuery();
  const { data: coursesData } = useGetCoursesQuery({ categoryId: category }, { skip: !category });
  const { data: coursesData2 } = useGetCoursesQuery({ categoryId: category2 }, { skip: !category2 });

  const [createApplication, { isLoading: isSubmitting }] = useCreateApplicationMutation();
  const [updateApplication] = useUpdateApplicationMutation();
  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation();

  const apiAdmissionTypes = admissionTypesData?.data?.admissionTypes;
  const admissionTypes: AdmissionTypeOption[] = (apiAdmissionTypes && apiAdmissionTypes.length > 0) ? apiAdmissionTypes : FALLBACK_ADMISSION_TYPES;
  const categories = categoriesData?.data?.categories || [];
  const admissionDomains = admissionType ? ADMISSION_TYPE_DOMAINS[admissionType] : undefined;
  const filteredCategories = admissionDomains
    ? categories.filter((cat: any) => admissionDomains.includes(cat.domain))
    : categories;
  const courses = coursesData?.data?.courses || [];
  const courses2 = coursesData2?.data?.courses || [];

  useEffect(() => {
    if (!existing) return;
    const catId = typeof existing.category === "object" ? existing.category?._id : existing.category;
    const pri = typeof existing.primaryCourse === "object" ? existing.primaryCourse?._id : existing.primaryCourse;
    const sec = typeof existing.secondaryCourse === "object" ? existing.secondaryCourse?._id : existing.secondaryCourse;
    const cat2Id = typeof existing.category2 === "object" ? existing.category2?._id : existing.category2;
    const pri2 = typeof existing.primaryCourse2 === "object" ? existing.primaryCourse2?._id : existing.primaryCourse2;
    const sec2 = typeof existing.secondaryCourse2 === "object" ? existing.secondaryCourse2?._id : existing.secondaryCourse2;

    setAdmissionType(existing.admissionType || "");
    setCategory(catId || "");
    setPrimaryCourse(pri || "");
    setSecondaryCourse(sec || "");
    const prevCat = typeof existing.previousCategory === "object" ? existing.previousCategory?._id : existing.previousCategory;
    setPreviousCategory(prevCat || "");
    setCategory2(cat2Id || "");
    setPrimaryCourse2(pri2 || "");
    setSecondaryCourse2(sec2 || "");

    setFormData((prev: any) => ({
      ...prev,
      name: existing.name || "",
      email: existing.email || "",
      address: existing.address || "",
      tenthMarks: existing.tenthMarks ?? "",
      twelfthMarks: existing.twelfthMarks ?? "",
      cetScore: existing.cetScore ?? "",
      jeeScore: existing.jeeScore ?? "",
      diplomaCollege: existing.diplomaCollege || "",
      diplomaCgpa: existing.diplomaCgpa ?? "",
      diplomaPercentage: existing.diplomaPercentage ?? "",
      diplomaYearOfPassing: existing.diplomaYearOfPassing ?? "",
      transferType: existing.transferType || "",
      previousCollegeName: existing.previousCollegeName || "",
      previousCollegeAddress: existing.previousCollegeAddress || "",
      previousCategory: prevCat || "",
    }));

    const docs: Record<string, { url: string; publicId: string }> = {};
    existing.documents?.forEach((d: any) => {
      docs[d.type] = { url: d.url, publicId: d.publicId || "" };
    });
    setUploaded(docs);

    if (existing.admissionType) {
      setMaxAccessedStep(5);
      setCurrentStep(1);
    }
  }, [existing]);

  if (isAppLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const updateForm = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const currentInfo = admissionType ? admissionTypeFields[admissionType] : null;
  const currentAdmissionType = admissionTypes.find((a: any) => a.slug?.toUpperCase() === admissionType || a._id === admissionType);
  const requiredDocTypes = currentAdmissionType?.requiredDocuments || [];
  const optionalDocTypes = currentAdmissionType?.optionalDocuments || [];

  const handleUpload = async (type: string) => {
    const file = fileRefs.current[type]?.files?.[0];
    if (!file) return;
    setUploadingType(type);
    try {
      const result: any = await uploadDocument({ file, type }).unwrap();
      setUploaded((prev) => ({ ...prev, [type]: { url: result.data.url, publicId: result.data.publicId } }));
      showToast({ title: "Uploaded", description: `${docLabel[type] || type} uploaded`, severity: "success" });
      if (fileRefs.current[type]) fileRefs.current[type]!.value = "";
    } catch (err: any) {
      showToast({ title: "Upload failed", description: err?.data?.message || "Try again", severity: "error" });
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (type: string) => {
    setDeletingType(type);
    try {
      await deleteDocument(type).unwrap();
      setUploaded((prev) => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
      showToast({ title: "Removed", description: `${docLabel[type] || type} removed`, severity: "success" });
    } catch (err: any) {
      showToast({ title: "Remove failed", description: err?.data?.message || "Try again", severity: "error" });
    } finally {
      setDeletingType(null);
    }
  };

  const submit = async () => {
    const documents = Object.entries(uploaded).map(([type, val]) => ({
      type,
      url: val.url,
      publicId: val.publicId,
      uploadedAt: new Date(),
    }));

    const payload: Record<string, any> = {
      name: formData.name,
      email: formData.email,
      address: formData.address,
      admissionType,
      category,
      primaryCourse,
      secondaryCourse: secondaryCourse || undefined,
      previousCategory: previousCategory || undefined,
      category2: category2 || undefined,
      primaryCourse2: primaryCourse2 || undefined,
      secondaryCourse2: secondaryCourse2 || undefined,
      documents,
    };

    if (currentInfo) {
      for (const field of currentInfo.fields) {
        const val = formData[field.key];
        if (val !== "" && val !== null && val !== undefined) {
          payload[field.key] = field.type === "number" || field.key === "tenthMarks" || field.key === "twelfthMarks" || field.key === "cetScore" || field.key === "jeeScore" || field.key === "diplomaCgpa" || field.key === "diplomaPercentage" || field.key === "diplomaYearOfPassing"
            ? Number(val)
            : val;
        }
      }
    }

    try {
      if (isEditing) {
        await updateApplication(payload).unwrap();
      } else {
        await createApplication(payload as any).unwrap();
      }
      showToast({ title: "Success", description: "Application saved", severity: "success" });
      router.push("/student/dashboard");
    } catch (err: any) {
      showToast({ title: "Error", description: err?.data?.message || "Failed to save", severity: "error" });
    }
  };

  const steps = [
    { label: "Admission Type", step: 0 },
    { label: "Personal Details", step: 1 },
    { label: "Academic Details", step: 2 },
    { label: "Course Selection", step: 3 },
    { label: "Documents", step: 4 },
    { label: "Review", step: 5 },
  ];

  const currentStepLabel = currentStep === 0 ? "Choose Admission Type"
    : currentStep === 1 ? "Personal Details"
      : currentStep === 2 ? "Academic Details"
        : currentStep === 3 ? "Course Selection"
          : currentStep === 4 ? "Documents"
            : "Review & Submit";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{isEditing ? "Edit Application" : "New Application"}</CardTitle>
            <CardDescription>{currentStepLabel}</CardDescription>
          </div>
          {isEditing ? <Badge variant="secondary">Editing</Badge> : null}
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <Badge
            key={s.step}
            variant={currentStep === s.step ? "default" : s.step > maxAccessedStep ? "secondary" : "outline"}
            className={`px-4 py-2 text-sm ${s.step <= maxAccessedStep ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
            onClick={() => {
              if (s.step <= maxAccessedStep) setCurrentStep(s.step);
            }}
          >
            {s.label}
          </Badge>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Step 0: Admission Type */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <Label>Select Admission Type</Label>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {admissionTypes
                  .filter((at: any) => at.slug?.toUpperCase() !== 'BRANCH_CHANGE') // TEMPORARILY HIDDEN
                  .map((at: any) => (
                    <Card
                      key={at._id}
                      className={`cursor-pointer border-2 transition-all ${admissionType === at.slug?.toUpperCase() ? "border-primary" : "hover:border-primary/50"}`}
                      onClick={() => setAdmissionType(at.slug?.toUpperCase())}
                    >
                      <CardHeader>
                        <CardTitle className="text-base">{at.name}</CardTitle>
                        {at.description && <CardDescription>{at.description}</CardDescription>}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {(at.requiredDocuments?.length || 0) + (at.optionalDocuments?.length || 0)} documents
                          ({at.requiredDocuments?.length || 0} required
                          {at.optionalDocuments?.length ? `, ${at.optionalDocuments.length} optional` : ''})
                        </p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {/* Step 1: Personal Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={formData.name} onChange={(e) => updateForm("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => updateForm("email", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address *</Label>
                <Input value={formData.address} onChange={(e) => updateForm("address", e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: Academic Details */}
          {currentStep === 2 && currentInfo && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Fields for: <strong>{currentInfo.label}</strong>
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {currentInfo.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.placeholder ? field.label : field.label + (field.key !== "jeeScore" ? " *" : "")}</Label>
                    {field.type === "select" ? (
                      <Select
                        value={formData[field.key]}
                        onChange={(e) => updateForm(field.key, e.target.value)}
                      >
                        <option value="">{field.placeholder || "Select"}</option>
                        <option value="TRANSFER">Transfer</option>
                        <option value="BRANCH_CHANGE">Branch Change</option>
                        <option value="COLLEGE_CHANGE">College Change</option>
                      </Select>
                    ) : (
                      <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.key]}
                        onChange={(e) => updateForm(field.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
                {/* For DSE FE: select which category they studied in First Year */}
                {admissionType === 'DIRECT_SECOND_YEAR_FE' && (
                  <div className="space-y-2">
                    <Label>Category studied in First Year *</Label>
                    <Select
                      value={previousCategory}
                      onChange={(e) => { setPreviousCategory(e.target.value); updateForm("previousCategory", e.target.value); }}
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((cat: any) => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This category will be disabled in course selection since you already studied it.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Course Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Select your primary and secondary course choices. Section 2 is optional.
              </p>

              {/* ── Section 1: Primary Choice ── */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-base">Section 1: Primary Choice *</h3>

                {/* Category 1 */}
                <div className="space-y-2">
                  <Label>Category *</Label>
                  {admissionType === 'DIRECT_SECOND_YEAR_FE' && (
                    <p className="text-xs text-muted-foreground mb-1">
                      You studied <strong>{categories.find((c: any) => c._id === previousCategory)?.name || 'a category'}</strong> in First Year — it is disabled below.
                    </p>
                  )}
                  <Select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPrimaryCourse("");
                      setSecondaryCourse("");
                      setCategory2("");
                      setPrimaryCourse2("");
                      setSecondaryCourse2("");
                    }}
                  >
                    <option value="">-- Select Category --</option>
                    {filteredCategories.map((cat: any) => {
                      const isDisabled = admissionType === 'DIRECT_SECOND_YEAR_FE' && cat._id === previousCategory;
                      return (
                        <option
                          key={cat._id}
                          value={cat._id}
                          disabled={isDisabled}
                          className={isDisabled ? "text-muted-foreground" : ""}
                        >
                          {cat.name}{isDisabled ? " (studied in First Year)" : ""}
                        </option>
                      );
                    })}
                  </Select>
                </div>

                {/* Primary Course 1 */}
                <div className="space-y-2">
                  <Label>Primary Course *</Label>
                  <Select
                    value={primaryCourse}
                    onChange={(e) => { setPrimaryCourse(e.target.value); setSecondaryCourse(""); }}
                    disabled={!category}
                  >
                    <option value="">
                      {category ? "-- Select Primary Course --" : "Select a category first"}
                    </option>
                    {courses.map((course: any) => (
                      <option key={course._id} value={course._id}>{course.name}</option>
                    ))}
                  </Select>
                  {category && courses.length === 0 && (
                    <p className="text-xs text-muted-foreground">No courses available for this category.</p>
                  )}
                </div>

                {/* Secondary Course 1 */}
                <div className="space-y-2">
                  <Label>Secondary Course <span className="text-muted-foreground">(optional)</span></Label>
                  <Select
                    value={secondaryCourse}
                    onChange={(e) => setSecondaryCourse(e.target.value)}
                    disabled={!primaryCourse}
                  >
                    <option value="">
                      {primaryCourse ? "-- Select Secondary Course --" : "Select a primary course first"}
                    </option>
                    {courses
                      .filter((c: any) => c._id !== primaryCourse)
                      .map((course: any) => (
                        <option key={course._id} value={course._id}>{course.name}</option>
                      ))}
                  </Select>
                  {primaryCourse && courses.filter((c: any) => c._id !== primaryCourse).length === 0 && (
                    <p className="text-xs text-muted-foreground">No other courses available in this category.</p>
                  )}
                </div>
              </div>

              {/* ── Section 2: Secondary Choice (optional) ── */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-base">Section 2: Additional Choice <span className="text-muted-foreground font-normal">(optional)</span></h3>

                {/* Category 2 */}
                <div className="space-y-2">
                  <Label>Category <span className="text-muted-foreground">(optional)</span></Label>
                  <Select
                    value={category2}
                    onChange={(e) => {
                      setCategory2(e.target.value);
                      setPrimaryCourse2("");
                      setSecondaryCourse2("");
                    }}
                    disabled={!category}
                  >
                    <option value="">
                      {category ? "-- Select Category --" : "Select primary category first"}
                    </option>
                    {filteredCategories.map((cat: any) => {
                      const isPrimaryCategory = cat._id === category;
                      return (
                        <option
                          key={cat._id}
                          value={cat._id}
                          disabled={isPrimaryCategory}
                          className={isPrimaryCategory ? "text-muted-foreground" : ""}
                        >
                          {cat.name}{isPrimaryCategory ? " (selected in Section 1)" : ""}
                        </option>
                      );
                    })}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All categories are shown. The category selected in Section 1 is disabled.
                  </p>
                </div>

                {/* Primary Course 2 */}
                <div className="space-y-2">
                  <Label>Primary Course <span className="text-muted-foreground">(optional)</span></Label>
                  <Select
                    value={primaryCourse2}
                    onChange={(e) => { setPrimaryCourse2(e.target.value); setSecondaryCourse2(""); }}
                    disabled={!category2}
                  >
                    <option value="">
                      {category2 ? "-- Select Primary Course --" : "Select a category first"}
                    </option>
                    {courses2.map((course: any) => (
                      <option key={course._id} value={course._id}>{course.name}</option>
                    ))}
                  </Select>
                  {category2 && courses2.length === 0 && (
                    <p className="text-xs text-muted-foreground">No courses available for this category.</p>
                  )}
                </div>

                {/* Secondary Course 2 */}
                <div className="space-y-2">
                  <Label>Secondary Course <span className="text-muted-foreground">(optional)</span></Label>
                  <Select
                    value={secondaryCourse2}
                    onChange={(e) => setSecondaryCourse2(e.target.value)}
                    disabled={!primaryCourse2}
                  >
                    <option value="">
                      {primaryCourse2 ? "-- Select Secondary Course --" : "Select a primary course first"}
                    </option>
                    {courses2
                      .filter((c: any) => c._id !== primaryCourse2)
                      .map((course: any) => (
                        <option key={course._id} value={course._id}>{course.name}</option>
                      ))}
                  </Select>
                  {primaryCourse2 && courses2.filter((c: any) => c._id !== primaryCourse2).length === 0 && (
                    <p className="text-xs text-muted-foreground">No other courses available in this category.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upload Documents</CardTitle>
                  <CardDescription>
                    {requiredDocTypes.length > 0
                      ? `Documents for ${admissionTypeFields[admissionType]?.label || admissionType}`
                      : "Upload relevant documents"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Required Documents */}
                  {requiredDocTypes.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Required Documents</h4>
                      {requiredDocTypes.map((type: string) => (
                        <div key={type} className="space-y-2">
                          <Label>{docLabel[type] || type.replace(/_/g, " ")} *</Label>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="file"
                              ref={(el) => { fileRefs.current[type] = el; }}
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={isUploading}
                            />
                            <Button type="button" variant="outline" onClick={() => handleUpload(type)} disabled={isUploading}>
                              {uploadingType === type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                              Upload
                            </Button>
                            {uploaded[type] && (
                              <>
                                <a href={uploaded[type].url} target="_blank" rel="noopener noreferrer">
                                  <Button type="button" variant="outline" size="sm">View</Button>
                                </a>
                                <Button type="button" variant="ghost" size="sm" disabled={isDeleting} onClick={() => handleDelete(type)}>
                                  {deletingType === type ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                                </Button>
                                <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Uploaded</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Optional Documents */}
                  {optionalDocTypes.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">Optional Documents <span className="font-normal">(already on file — upload only if needed)</span></h4>
                      {optionalDocTypes.map((type: string) => (
                        <div key={type} className="space-y-2">
                          <Label>{docLabel[type] || type.replace(/_/g, " ")} <span className="text-muted-foreground font-normal">(optional)</span></Label>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="file"
                              ref={(el) => { fileRefs.current[type] = el; }}
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={isUploading}
                            />
                            <Button type="button" variant="outline" onClick={() => handleUpload(type)} disabled={isUploading}>
                              {uploadingType === type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                              Upload
                            </Button>
                            {uploaded[type] && (
                              <>
                                <a href={uploaded[type].url} target="_blank" rel="noopener noreferrer">
                                  <Button type="button" variant="outline" size="sm">View</Button>
                                </a>
                                <Button type="button" variant="ghost" size="sm" disabled={isDeleting} onClick={() => handleDelete(type)}>
                                  {deletingType === type ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                                </Button>
                                <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Uploaded</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Application Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div><span className="font-medium">Admission Type:</span> {admissionTypeFields[admissionType]?.label || admissionType}</div>
                    <div><span className="font-medium">Name:</span> {formData.name}</div>
                    <div><span className="font-medium">Email:</span> {formData.email}</div>
                    <div><span className="font-medium">Address:</span> {formData.address}</div>
                    {currentInfo?.fields.map((f) => (
                      formData[f.key] ? <div key={f.key}><span className="font-medium">{f.label}:</span> {formData[f.key]}</div> : null
                    ))}
                    <div><span className="font-medium">Primary Category:</span> {categories.find((c: any) => c._id === category)?.name || "Not selected"}</div>
                    <div><span className="font-medium">Primary Course:</span> {courses.find((c: any) => c._id === primaryCourse)?.name || "Not selected"}</div>
                    {secondaryCourse && (
                      <div><span className="font-medium">Secondary Course:</span> {courses.find((c: any) => c._id === secondaryCourse)?.name || ""}</div>
                    )}
                    {category2 && (
                      <>
                        <div><span className="font-medium">Section 2 Category:</span> {categories.find((c: any) => c._id === category2)?.name || ""}</div>
                        <div><span className="font-medium">Section 2 Primary Course:</span> {courses2.find((c: any) => c._id === primaryCourse2)?.name || ""}</div>
                        {secondaryCourse2 && (
                          <div><span className="font-medium">Section 2 Secondary Course:</span> {courses2.find((c: any) => c._id === secondaryCourse2)?.name || ""}</div>
                        )}
                      </>
                    )}
                    <div><span className="font-medium">Documents Uploaded:</span> {Object.keys(uploaded).length}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        {currentStep > 0 ? (
          <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>Previous</Button>
        ) : <span />}

        {currentStep < 5 ? (
          <Button onClick={() => {
            if (currentStep === 0 && !admissionType) {
              showToast({ title: "Required", description: "Please select an admission type", severity: "error" });
              return;
            }
            if (currentStep === 1 && (!formData.name || !formData.email || !formData.address)) {
              showToast({ title: "Required", description: "Please fill all personal details", severity: "error" });
              return;
            }
            if (currentStep === 2 && currentInfo) {
              const required = currentInfo.fields.filter((f) => f.key !== "jeeScore" && f.key !== "diplomaCgpa");
              const empty = required.filter((f) => !formData[f.key] && formData[f.key] !== 0);
              if (empty.length > 0) {
                showToast({ title: "Required", description: `Please fill: ${empty.map((f) => f.label).join(", ")}`, severity: "error" });
                return;
              }
            }
            if (currentStep === 3 && (!category || !primaryCourse)) {
              showToast({ title: "Required", description: "Please select a category and primary course", severity: "error" });
              return;
            }
            setMaxAccessedStep((prev) => Math.max(prev, currentStep + 1));
            setCurrentStep(currentStep + 1);
          }}>
            Next
          </Button>
        ) : (
          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Application"}
          </Button>
        )}
      </div>
    </div>
  );
}
