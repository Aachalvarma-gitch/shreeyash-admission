"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuthStore } from "@/hooks/use-auth";
import {
  useCreateCategoryMutation,
  useCreateCourseMutation,
  useDeleteCategoryMutation,
  useDeleteCourseMutation,
  useGetCategoriesQuery,
  useGetCoursesQuery,
  useUpdateCategoryMutation,
  useUpdateCourseMutation,
} from "@/lib/api/course.api";
import { useShowToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

const emptyCategory = { name: "", slug: "", description: "", displayOrder: 0, isActive: true };
const emptyCourse = {
  name: "",
  code: "",
  description: "",
  duration: 4,
  fees: 0,
  seats: 0,
  displayOrder: 0,
  isActive: true,
};

export default function AdminCoursesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { showToast } = useShowToast();

  const { data: categoriesData, isLoading: isLoadingCats, refetch: refetchCategories } = useGetCategoriesQuery();
  const categories = useMemo(() => categoriesData?.data?.categories || [], [categoriesData]);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: coursesData, isLoading: isLoadingCourses, refetch: refetchCourses } = useGetCoursesQuery(
    selectedCategoryId ? { category: selectedCategoryId } : undefined,
    { skip: !selectedCategoryId }
  );
  const courses = useMemo(() => coursesData?.data?.courses || [], [coursesData]);
  const filteredCourses = useMemo(
    () =>
      courses.filter(
        (c: any) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.code.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [courses, searchTerm]
  );

  const [createCategory, { isLoading: isCreatingCat }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdatingCat }] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [createCourse, { isLoading: isCreatingCourse }] = useCreateCourseMutation();
  const [updateCourse, { isLoading: isUpdatingCourse }] = useUpdateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState<any>(emptyCategory);
  const [courseForm, setCourseForm] = useState<any>(emptyCourse);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!selectedCategoryId && categories.length) {
      const firstCategory = categories[0];
      if (firstCategory) {
        setSelectedCategoryId(firstCategory._id);
      }
    }
  }, [categories, selectedCategoryId]);

  if (!isAuthenticated) return null;

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ ...emptyCategory, displayOrder: categories.length });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      displayOrder: cat.displayOrder ?? 0,
      isActive: !!cat.isActive,
    });
    setCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory._id, data: categoryForm }).unwrap();
      } else {
        await createCategory(categoryForm).unwrap();
      }
      setCategoryDialogOpen(false);
      refetchCategories();
      showToast({ title: "Success", description: "Category saved", severity: "success" });
    } catch (err: any) {
      showToast({ title: "Error", description: err?.data?.message || "Save failed", severity: "error" });
    }
  };

  const removeCategory = async (cat: any) => {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat._id).unwrap();
      if (selectedCategoryId === cat._id) setSelectedCategoryId("");
      refetchCategories();
      showToast({ title: "Success", description: "Category deleted", severity: "success" });
    } catch (err: any) {
      showToast({ title: "Error", description: err?.data?.message || "Delete failed", severity: "error" });
    }
  };

  const openCreateCourse = () => {
    if (!selectedCategoryId) return;
    setEditingCourse(null);
    setCourseForm({ ...emptyCourse, category: selectedCategoryId, displayOrder: courses.length });
    setCourseDialogOpen(true);
  };

  const openEditCourse = (course: any) => {
    setEditingCourse(course);
    setCourseForm({
      name: course.name,
      code: course.code,
      category: typeof course.category === "string" ? course.category : course.category?._id,
      description: course.description || "",
      duration: course.duration ?? 4,
      fees: course.fees ?? 0,
      seats: course.seats ?? 0,
      displayOrder: course.displayOrder ?? 0,
      isActive: !!course.isActive,
    });
    setCourseDialogOpen(true);
  };

  const saveCourse = async () => {
    try {
      if (editingCourse) {
        await updateCourse({ id: editingCourse._id, data: courseForm }).unwrap();
      } else {
        await createCourse(courseForm).unwrap();
      }
      setCourseDialogOpen(false);
      refetchCourses();
      showToast({ title: "Success", description: "Course saved", severity: "success" });
    } catch (err: any) {
      showToast({ title: "Error", description: err?.data?.message || "Save failed", severity: "error" });
    }
  };

  const removeCourse = async (course: any) => {
    if (!confirm(`Delete "${course.name}"?`)) return;
    try {
      await deleteCourse(course._id).unwrap();
      refetchCourses();
      showToast({ title: "Success", description: "Course deleted", severity: "success" });
    } catch (err: any) {
      showToast({ title: "Error", description: err?.data?.message || "Delete failed", severity: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={openCreateCategory}>Add Category</Button>
            {isLoadingCats ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              categories.map((cat: any) => (
                <div key={cat._id} className="flex items-center justify-between">
                  <Button
                    variant={selectedCategoryId === cat._id ? "secondary" : "ghost"}
                    onClick={() => setSelectedCategoryId(cat._id)}
                  >
                    {cat.name}
                  </Button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEditCategory(cat)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeCategory(cat)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search courses"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button onClick={openCreateCourse} disabled={!selectedCategoryId}>
                Add Course
              </Button>
            </div>

            {isLoadingCourses ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course: any) => (
                    <TableRow key={course._id}>
                      <TableCell>{course.name}</TableCell>
                      <TableCell>{course.code}</TableCell>
                      <TableCell>{course.duration}</TableCell>
                      <TableCell>{course.seats}</TableCell>
                      <TableCell>{course.fees}</TableCell>
                      <TableCell>
                        <Badge variant={course.isActive ? "default" : "secondary"}>
                          {course.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditCourse(course)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeCourse(course)}>
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
      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>Manage category details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, name: e.target.value }))}
            />
            <Label>Slug</Label>
            <Input
              value={categoryForm.slug}
              onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, slug: e.target.value }))}
            />
            <Label>Description</Label>
            <Textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, description: e.target.value }))}
            />
            <Label>Display Order</Label>
            <Input
              type="number"
              value={categoryForm.displayOrder}
              onChange={(e) =>
                setCategoryForm((prev: any) => ({ ...prev, displayOrder: Number(e.target.value) }))
              }
            />
            <Label>Status</Label>
            <Select
              value={String(categoryForm.isActive)}
              onChange={(e) =>
                setCategoryForm((prev: any) => ({ ...prev, isActive: e.target.value === "true" }))
              }
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCategory} disabled={isCreatingCat || isUpdatingCat}>
              {isCreatingCat || isUpdatingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "Add Course"}</DialogTitle>
            <DialogDescription>Manage course details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={courseForm.name}
              onChange={(e) => setCourseForm((prev: any) => ({ ...prev, name: e.target.value }))}
            />
            <Label>Code</Label>
            <Input
              value={courseForm.code}
              onChange={(e) => setCourseForm((prev: any) => ({ ...prev, code: e.target.value }))}
            />
            <Label>Description</Label>
            <Textarea
              value={courseForm.description}
              onChange={(e) => setCourseForm((prev: any) => ({ ...prev, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  type="number"
                  value={courseForm.duration}
                  onChange={(e) =>
                    setCourseForm((prev: any) => ({ ...prev, duration: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Seats</Label>
                <Input
                  type="number"
                  value={courseForm.seats}
                  onChange={(e) => setCourseForm((prev: any) => ({ ...prev, seats: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Fees</Label>
                <Input
                  type="number"
                  value={courseForm.fees}
                  onChange={(e) => setCourseForm((prev: any) => ({ ...prev, fees: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={courseForm.displayOrder}
                  onChange={(e) =>
                    setCourseForm((prev: any) => ({ ...prev, displayOrder: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <Label>Status</Label>
            <Select
              value={String(courseForm.isActive)}
              onChange={(e) => setCourseForm((prev: any) => ({ ...prev, isActive: e.target.value === "true" }))}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCourse} disabled={isCreatingCourse || isUpdatingCourse}>
              {isCreatingCourse || isUpdatingCourse ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
