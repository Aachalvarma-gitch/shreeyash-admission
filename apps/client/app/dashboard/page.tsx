"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    const role = user.role?.name;

    if (role === "Student") {
      router.push("/student/dashboard");
    } else if (role === "Admin") {
      router.push("/admin/dashboard");
    } else if (role === "Super Admin") {
      router.push("/superadmin/dashboard");
    } else {
      router.push("/");
    }
  }, [user, isAuthenticated, isLoading, router]);

  return null;
}
