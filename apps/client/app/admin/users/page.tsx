"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import { useGetUsersQuery, useCreateUserMutation, useDeleteUserMutation } from "@/lib/api/admin.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, UserCheck } from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  
  const { data, isLoading, refetch } = useGetUsersQuery({ 
    role: role || undefined, 
    page, 
    limit: 20 
  });
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    role: "Admin",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.firstName) return;
    try {
      await createUser(formData).unwrap();
      setShowModal(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
        password: "",
        role: "Admin",
      });
      refetch();
    } catch (err) {
      console.error("Failed to create user:", err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Deactivate this user?")) return;
    try {
      await deleteUser(id).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage admins (Super Admin only)</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Role Filters */}
      <div className="flex gap-2">
        {["", "Admin", "Super Admin"].map((r) => (
          <button
            key={r}
            onClick={() => { setRole(r); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              role === r
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {r || "All Users"}
          </button>
        ))}
      </div>

      {/* Users List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No users found
            </div>
          ) : (
            <div className="divide-y">
              {users.map((u: any) => (
                <div key={u._id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium">{u.firstName} {u.lastName}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      u.role?.name === "Super Admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {u.role?.name}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDeleteUser(u._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add New Admin</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input 
                    value={formData.firstName} 
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                    placeholder="First name" 
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input 
                    value={formData.lastName} 
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                    placeholder="Last name" 
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  placeholder="admin@example.com" 
                />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input 
                  value={formData.mobile} 
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})} 
                  placeholder="1234567890" 
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input 
                  type="password"
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  placeholder="Min 8 characters" 
                />
              </div>
              <div>
                <Label>Role</Label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="Admin">Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button 
                className="flex-1" 
                onClick={handleCreateUser} 
                disabled={isCreating || !formData.email || !formData.password || !formData.firstName}
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}