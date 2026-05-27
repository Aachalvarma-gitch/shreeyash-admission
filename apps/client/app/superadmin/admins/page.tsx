"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Users, Plus, ArrowLeft, Loader2, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAuthStore } from "@/hooks/use-auth";

export default function SuperAdminAdmins() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    mobile: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role?.name !== "Super Admin") {
      router.push("/login");
      return;
    }

    const fetchAdmins = async () => {
      try {
        console.log("Fetching admins...");
        const response = await api.get("/superadmin/admins");
        console.log("Admins response:", response);
        setAdmins(response.data.data.admins || response.data.data || []);
      } catch (error: any) {
        console.error("Failed to fetch admins:", error);
        console.error("Error response:", error.response || error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdmins();
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/superadmin/admins", { ...formData, role: "Admin" });
      setShowModal(false);
      setFormData({ email: "", mobile: "", firstName: "", lastName: "", password: "" });
      const response = await api.get("/superadmin/admins");
      setAdmins(response.data.data.admins || response.data.data || []);
    } catch (error: any) {
      console.error("Failed to create admin:", error);
      console.error("Error response:", error.response || error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this admin?")) return;
    try {
      await api.delete(`/superadmin/admins/${id}`);
      setAdmins(admins.filter((a) => a._id !== id));
    } catch (error: any) {
      console.error("Failed to delete admin:", error);
      console.error("Error response:", error.response || error);
    }
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      admin.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      admin.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 relative">
              <Image src="https://syp.ac.in/images/logo/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="font-bold text-gray-900">Super Admin</span>
          </Link>
        </div>

        <nav className="p-4 space-y-2">
          <Link href="/superadmin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition">
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/superadmin/courses" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition">
            <span className="font-medium">Courses</span>
          </Link>
          <Link href="/superadmin/inquiries" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition">
            <span className="font-medium">Inquiries</span>
          </Link>
          <Link href="/superadmin/admins" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-600 text-white">
            <Users className="w-5 h-5" />
            <span className="font-medium">Admins</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/superadmin/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-green-600 mb-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Manage Admins</h1>
            <p className="text-gray-600">Create and manage admin users</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Admin
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search admins..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Admins List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAdmins.map((admin) => (
              <div key={admin._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-green-600">
                      {admin.firstName?.[0]}{admin.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(admin._id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900">{admin.firstName} {admin.lastName}</h3>
                <p className="text-sm text-gray-600">{admin.email}</p>
                <p className="text-sm text-gray-500">{admin.mobile}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Created: {new Date(admin.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Admin</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Temporary Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-green-600">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Admin"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}