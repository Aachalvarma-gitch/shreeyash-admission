"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";

const ADMISSION_TYPE_DOMAINS: Record<string, string[]> = {
  POLYTECHNIC: ['mechanical', 'civil', 'electrical', 'electronics'],
  ENGINEERING_FIRST_YEAR: ['computing', 'mechanical', 'civil', 'electrical', 'electronics'],
  DIRECT_SECOND_YEAR: ['computing', 'mechanical', 'civil', 'electrical', 'electronics'],
  DIRECT_SECOND_YEAR_DIPLOMA: ['computing', 'mechanical', 'civil', 'electrical', 'electronics'],
  DIRECT_SECOND_YEAR_FE: ['computing', 'mechanical', 'civil', 'electrical', 'electronics'],
  COLLEGE_TRANSFER: ['computing', 'mechanical', 'civil', 'electrical', 'electronics', 'commerce', 'arts', 'pharmacy', 'management', 'science'],
  BRANCH_CHANGE: ['computing', 'mechanical', 'civil', 'electrical', 'electronics', 'commerce', 'arts', 'pharmacy', 'management', 'science'],
};

const ADMISSION_TYPES = [
  { value: "POLYTECHNIC", label: "Polytechnic" },
  { value: "ENGINEERING_FIRST_YEAR", label: "Engineering First Year" },
  { value: "DIRECT_SECOND_YEAR", label: "Direct Second Year" },
  { value: "DIRECT_SECOND_YEAR_DIPLOMA", label: "DSY (After Diploma)" },
  { value: "DIRECT_SECOND_YEAR_FE", label: "DSY (After First Year)" },
  { value: "COLLEGE_TRANSFER", label: "College Transfer" },
  { value: "BRANCH_CHANGE", label: "Branch Change" },
];

const steps = [
  { id: 0, title: "Admission Type" },
  { id: 1, title: "Personal Details" },
  { id: 2, title: "Academic Details" },
  { id: 3, title: "Course Selection" },
];

interface Category { _id: string; name: string }
interface Course { _id: string; name: string; code: string }

export default function AdminCreateApplicationPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Form state
  const [admissionType, setAdmissionType] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [tenthMarks, setTenthMarks] = useState("");
  const [twelfthMarks, setTwelfthMarks] = useState("");
  const [cetScore, setCetScore] = useState("");
  const [jeeScore, setJeeScore] = useState("");
  const [diplomaCollege, setDiplomaCollege] = useState("");
  const [diplomaCgpa, setDiplomaCgpa] = useState("");
  const [diplomaPercentage, setDiplomaPercentage] = useState("");
  const [diplomaYearOfPassing, setDiplomaYearOfPassing] = useState("");
  const [transferType, setTransferType] = useState("TRANSFER");
  const [previousCollegeName, setPreviousCollegeName] = useState("");
  const [previousCollegeAddress, setPreviousCollegeAddress] = useState("");
  const [category, setCategory] = useState("");
  const [primaryCourse, setPrimaryCourse] = useState("");
  const [secondaryCourse, setSecondaryCourse] = useState("");

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    const fetchCategories = async () => {
      try {
        const resp = await api.get("/courses/public/categories");
        setCategories(resp.data.data.categories);
      } catch (err) { console.error(err); }
    };
    fetchCategories();
  }, [isAuthenticated, router]);

  const handleCategoryChange = async (catId: string) => {
    setCategory(catId);
    setPrimaryCourse("");
    setSecondaryCourse("");
    if (!catId) { setCourses([]); return; }
    try {
      const resp = await api.get(`/courses/public/courses/${catId}`);
      setCourses(resp.data.data.courses);
    } catch (err) { console.error(err); }
  };

  if (!isAuthenticated) return null;

  const admissionDomains = admissionType ? ADMISSION_TYPE_DOMAINS[admissionType] : undefined;
  const filteredCategories = admissionDomains
    ? categories.filter((cat: any) => admissionDomains.includes(cat.domain))
    : categories;

  const showTwelfth = ["ENGINEERING_FIRST_YEAR", "DIRECT_SECOND_YEAR_FE", "COLLEGE_TRANSFER", "BRANCH_CHANGE"].includes(admissionType);
  const showCet = ["ENGINEERING_FIRST_YEAR", "DIRECT_SECOND_YEAR_FE", "BRANCH_CHANGE"].includes(admissionType);
  const showDiploma = ["DIRECT_SECOND_YEAR", "DIRECT_SECOND_YEAR_DIPLOMA"].includes(admissionType);
  const showPreviousCollege = ["DIRECT_SECOND_YEAR_FE", "COLLEGE_TRANSFER", "BRANCH_CHANGE"].includes(admissionType);
  const showTransferType = ["COLLEGE_TRANSFER", "BRANCH_CHANGE"].includes(admissionType);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Admission Type</Label>
              <Select value={admissionType} onChange={(e) => setAdmissionType(e.target.value)}>
                <option value="">Select admission type</option>
                {ADMISSION_TYPES.map((at) => (
                  <option key={at.value} value={at.value}>{at.label}</option>
                ))}
              </Select>
            </div>
            {admissionType && (
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                Selected: <strong>{ADMISSION_TYPES.find((a) => a.value === admissionType)?.label}</strong>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student's full name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>10th Marks (%)</Label>
                <Input type="number" step="0.01" min="0" max="100" value={tenthMarks} onChange={(e) => setTenthMarks(e.target.value)} />
              </div>
              {showTwelfth && (
                <div className="space-y-2">
                  <Label>12th Marks (%)</Label>
                  <Input type="number" step="0.01" min="0" max="100" value={twelfthMarks} onChange={(e) => setTwelfthMarks(e.target.value)} />
                </div>
              )}
            </div>

            {showCet && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CET Score</Label>
                  <Input type="number" min="0" max="200" value={cetScore} onChange={(e) => setCetScore(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>JEE Score (optional)</Label>
                  <Input type="number" min="0" max="360" value={jeeScore} onChange={(e) => setJeeScore(e.target.value)} />
                </div>
              </div>
            )}

            {showDiploma && (
              <>
                <div className="space-y-2">
                  <Label>Diploma College</Label>
                  <Input value={diplomaCollege} onChange={(e) => setDiplomaCollege(e.target.value)} placeholder="Name of diploma college" />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Diploma CGPA</Label>
                    <Input type="number" step="0.01" min="0" max="10" value={diplomaCgpa} onChange={(e) => setDiplomaCgpa(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Diploma Percentage</Label>
                    <Input type="number" step="0.01" min="0" max="100" value={diplomaPercentage} onChange={(e) => setDiplomaPercentage(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Year of Passing</Label>
                    <Input type="number" min="2020" max="2030" value={diplomaYearOfPassing} onChange={(e) => setDiplomaYearOfPassing(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {showPreviousCollege && (
              <>
                <div className="space-y-2">
                  <Label>Previous College Name</Label>
                  <Input value={previousCollegeName} onChange={(e) => setPreviousCollegeName(e.target.value)} placeholder="Name of previous college" />
                </div>
                <div className="space-y-2">
                  <Label>Previous College Address</Label>
                  <Input value={previousCollegeAddress} onChange={(e) => setPreviousCollegeAddress(e.target.value)} placeholder="College address" />
                </div>
              </>
            )}

            {showTransferType && (
              <div className="space-y-2">
                <Label>Transfer Type</Label>
                <Select value={transferType} onChange={(e) => setTransferType(e.target.value)}>
                  <option value="TRANSFER">College Transfer</option>
                  <option value="BRANCH_CHANGE">Branch Change</option>
                  <option value="COLLEGE_CHANGE">College Change</option>
                </Select>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
                <option value="">Select Category</option>
                {filteredCategories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </Select>
            </div>
            {category && (
              <>
                <div className="space-y-2">
                  <Label>Primary Course</Label>
                  <Select value={primaryCourse} onChange={(e) => setPrimaryCourse(e.target.value)}>
                    <option value="">Select Primary Course</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Course (optional)</Label>
                  <Select value={secondaryCourse} onChange={(e) => setSecondaryCourse(e.target.value)}>
                    <option value="">Select Secondary Course</option>
                    {courses.filter((c) => c._id !== primaryCourse).map((c) => (
                      <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                    ))}
                  </Select>
                </div>
              </>
            )}
          </div>
        );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!admissionType;
      case 1: return !!name && !!email && !!address;
      case 2: return true;
      case 3: return !!category && !!primaryCourse;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const payload: any = {
        admissionType,
        name, email, address,
        category, primaryCourse,
        secondaryCourse: secondaryCourse || undefined,
        tenthMarks: tenthMarks ? Number(tenthMarks) : undefined,
      };

      if (showTwelfth) payload.twelfthMarks = twelfthMarks ? Number(twelfthMarks) : undefined;
      if (showCet) {
        payload.cetScore = cetScore ? Number(cetScore) : undefined;
        payload.jeeScore = jeeScore ? Number(jeeScore) : undefined;
      }
      if (showDiploma) {
        payload.diplomaCollege = diplomaCollege || undefined;
        payload.diplomaCgpa = diplomaCgpa ? Number(diplomaCgpa) : undefined;
        payload.diplomaPercentage = diplomaPercentage ? Number(diplomaPercentage) : undefined;
        payload.diplomaYearOfPassing = diplomaYearOfPassing ? Number(diplomaYearOfPassing) : undefined;
      }
      if (showPreviousCollege) {
        payload.previousCollegeName = previousCollegeName || undefined;
        payload.previousCollegeAddress = previousCollegeAddress || undefined;
      }
      if (showTransferType) {
        payload.transferType = transferType;
      }

      await api.post("/student/application", payload);
      router.push("/admin/applications");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit application");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create Application</h1>
          <p className="text-muted-foreground">Manually create an application for a student</p>
        </div>

        <div className="flex space-x-2 overflow-x-auto">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex-1 min-w-[100px] rounded-lg p-3 text-center ${
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step.id
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <p className="text-sm font-medium">Step {step.id + 1}</p>
              <p className="text-xs">{step.title}</p>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep]?.title}</CardTitle>
            <CardDescription>
              {currentStep === 0 && "Select the type of admission"}
              {currentStep === 1 && "Enter the student's personal details"}
              {currentStep === 2 && "Enter academic marks and scores based on admission type"}
              {currentStep === 3 && "Select course preferences"}
            </CardDescription>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>

        <div className="flex justify-between">
          {currentStep > 0 && (
            <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>
              Previous
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button className="ml-auto" onClick={() => setCurrentStep((s) => s + 1)} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button className="ml-auto" onClick={handleSubmit} disabled={!canProceed() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
