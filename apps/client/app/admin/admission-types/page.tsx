"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import {
  useGetAdmissionTypesQuery,
  useCreateAdmissionTypeMutation,
  useUpdateAdmissionTypeMutation,
  useDeleteAdmissionTypeMutation,
} from "@/lib/api/admin.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

const ALL_DOC_TYPES = [
  { value: "tenth_marksheet", label: "10th Marksheet" },
  { value: "twelfth_marksheet", label: "12th Marksheet" },
  { value: "cet_result", label: "CET Scorecard" },
  { value: "jee_result", label: "JEE Scorecard" },
  { value: "photo", label: "Photo" },
  { value: "leaving_certificate", label: "Leaving Certificate" },
  { value: "aadhaar_card", label: "Aadhaar Card" },
  { value: "passport_photo", label: "Passport Photo" },
  { value: "cet_jee_scorecard", label: "CET/JEE Scorecard" },
  { value: "diploma_marksheet", label: "Diploma Marksheet" },
  { value: "diploma_result", label: "Diploma Result" },
  { value: "diploma_certificate", label: "Diploma Certificate" },
  { value: "previous_college_bonafide", label: "Previous College Bonafide" },
  { value: "previous_year_marksheet", label: "Previous Year Marksheet" },
  { value: "transfer_certificate", label: "Transfer Certificate" },
  { value: "migration_certificate", label: "Migration Certificate" },
  { value: "fee_receipt", label: "Fee Receipt" },
  { value: "first_year_marksheet", label: "First Year Marksheet" },
];

const defaultForm = {
  name: "",
  slug: "",
  description: "",
  fee: 0,
  displayOrder: 0,
  requiredDocuments: [] as string[],
  optionalDocuments: [] as string[],
};

export default function AdminAdmissionTypesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data, isLoading, refetch } = useGetAdmissionTypesQuery({});
  const [createType, { isLoading: isCreating }] = useCreateAdmissionTypeMutation();
  const [updateType, { isLoading: isUpdating }] = useUpdateAdmissionTypeMutation();
  const [deleteType, { isLoading: isDeleting }] = useDeleteAdmissionTypeMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const types = data?.data?.admissionTypes || [];

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleEdit = (type: any) => {
    setForm({
      name: type.name,
      slug: type.slug,
      description: type.description || "",
      fee: type.fee || 0,
      displayOrder: type.displayOrder || 0,
      requiredDocuments: type.requiredDocuments || [],
      optionalDocuments: type.optionalDocuments || [],
    });
    setEditingId(type._id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateType({ id: editingId, data: form }).unwrap();
      } else {
        await createType(form).unwrap();
      }
      setShowModal(false);
      resetForm();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || "Failed to save admission type");
    }
  };

  const handleToggleActive = async (type: any) => {
    try {
      await updateType({ id: type._id, data: { isActive: !type.isActive } }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || "Failed to toggle status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this admission type?")) return;
    try {
      await deleteType(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || "Failed to delete admission type");
    }
  };

  const toggleDoc = (list: "requiredDocuments" | "optionalDocuments", value: string) => {
    setForm((prev) => ({
      ...prev,
      [list]: prev[list].includes(value)
        ? prev[list].filter((d) => d !== value)
        : [...prev[list], value],
    }));
  };

  const docLabel = (value: string) => ALL_DOC_TYPES.find((d) => d.value === value)?.label || value;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Admission Types</CardTitle>
          <Dialog
            open={showModal}
            onOpenChange={(open) => {
              setShowModal(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setShowModal(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Admission Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit" : "Create"} Admission Type</DialogTitle>
                <DialogDescription>
                  Configure the admission type details and required documents.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Engineering First Year"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                      placeholder="e.g. engineering_first_year"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Describe this admission type..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fee (INR)</Label>
                    <Input
                      type="number"
                      value={form.fee}
                      onChange={(e) => setForm((p) => ({ ...p, fee: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={form.displayOrder}
                      onChange={(e) => setForm((p) => ({ ...p, displayOrder: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Required Documents</Label>
                  <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                    {ALL_DOC_TYPES.map((doc) => (
                      <label key={doc.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.requiredDocuments.includes(doc.value)}
                          onChange={() => {
                            if (form.requiredDocuments.includes(doc.value)) {
                              setForm((p) => ({
                                ...p,
                                requiredDocuments: p.requiredDocuments.filter((d) => d !== doc.value),
                              }));
                            } else {
                              setForm((p) => ({
                                ...p,
                                requiredDocuments: [...p.requiredDocuments, doc.value],
                                optionalDocuments: p.optionalDocuments.filter((d) => d !== doc.value),
                              }));
                            }
                          }}
                        />
                        {doc.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Optional Documents</Label>
                  <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                    {ALL_DOC_TYPES.map((doc) => (
                      <label key={doc.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.optionalDocuments.includes(doc.value)}
                          onChange={() => {
                            if (form.optionalDocuments.includes(doc.value)) {
                              setForm((p) => ({
                                ...p,
                                optionalDocuments: p.optionalDocuments.filter((d) => d !== doc.value),
                              }));
                            } else {
                              setForm((p) => ({
                                ...p,
                                optionalDocuments: [...p.optionalDocuments, doc.value],
                                requiredDocuments: p.requiredDocuments.filter((d) => d !== doc.value),
                              }));
                            }
                          }}
                        />
                        {doc.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!form.name || !form.slug || isCreating || isUpdating}>
                  {(isCreating || isUpdating) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingId ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading admission types...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Required Docs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type: any) => (
                  <TableRow key={type._id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell className="text-muted-foreground">{type.slug}</TableCell>
                    <TableCell>₹{type.fee?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(type.requiredDocuments || []).slice(0, 3).map((doc: string) => (
                          <Badge key={doc} variant="secondary" className="text-xs">
                            {docLabel(doc)}
                          </Badge>
                        ))}
                        {(type.requiredDocuments?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{type.requiredDocuments.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.isActive ? "default" : "secondary"}>
                        {type.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{type.displayOrder}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleActive(type)}>
                          {type.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(type._id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {types.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No admission types found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
