"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuthStore } from "@/hooks/use-auth";
import {
  useChangePasswordMutation,
  useGetProfileQuery,
  useSeedDataMutation,
  useUpdateProfileMutation,
} from "@/lib/api/admin.api";
import { useShowToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { showToast } = useShowToast();

  const { data, refetch } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [seedData, { isLoading: isSeeding }] = useSeedDataMutation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    const u = data?.data?.user;
    if (!u) return;
    setFirstName(u.firstName || "");
    setLastName(u.lastName || "");
    setMobile(u.mobile || "");
  }, [data]);

  if (!isAuthenticated) return null;

  const userData = data?.data?.user;
  const roleName = userData?.role?.name || (user as any)?.role?.name || "Admin";

  const handleUpdateProfile = async () => {
    try {
      await updateProfile({ firstName, lastName, mobile }).unwrap();
      showToast({ title: "Success", description: "Profile updated", severity: "success" });
      refetch();
    } catch (err: any) {
      showToast({ title: "Error", description: err?.data?.message || "Update failed", severity: "error" });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      showToast({ title: "Error", description: "Enter current password", severity: "error" });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      showToast({ title: "Error", description: "Minimum 8 characters", severity: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ title: "Error", description: "Passwords do not match", severity: "error" });
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      showToast({ title: "Success", description: "Password changed", severity: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast({ title: "Error", description: err?.data?.message || "Password change failed", severity: "error" });
    }
  };

  const handleSeedData = async () => {
    if (!confirm("Generate sample data?")) return;
    try {
      await seedData().unwrap();
      showToast({ title: "Success", description: "Sample data created", severity: "success" });
    } catch (err: any) {
      showToast({ title: "Error", description: err?.data?.message || "Seed failed", severity: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={userData?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Mobile</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={roleName} disabled />
          </div>
          <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
            {isUpdatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <div className="flex gap-2">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Button variant="outline" size="icon" onClick={() => setShowCurrentPassword((v) => !v)}>
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="flex gap-2">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button variant="outline" size="icon" onClick={() => setShowNewPassword((v) => !v)}>
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <div className="flex gap-2">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button variant="outline" size="icon" onClick={() => setShowConfirmPassword((v) => !v)}>
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={isChangingPassword}>
            {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>
            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Sample Data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
