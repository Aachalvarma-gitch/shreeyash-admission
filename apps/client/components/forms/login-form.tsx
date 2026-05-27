"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLoginMutation } from "@/lib/api/auth.api";
import { setTokens } from "@/lib/api/baseQuery";
import { useAuthStore } from "@/hooks/use-auth";

const loginSchema = z.object({
  emailOrMobile: z.string().min(1, "Email or Mobile is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [login, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrMobile: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const result = await login(data).unwrap();

      if (result.data?.accessToken && result.data?.refreshToken) {
        setTokens(result.data.accessToken, result.data.refreshToken);
        setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);

        const role = result.data.user.role?.name;
        if (role === "Student") {
          router.push("/student/dashboard");
        } else if (role === "Super Admin") {
          router.push("/superadmin/dashboard");
        } else if (role === "Admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/");
        }
      }
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      setError("emailOrMobile", {
        message: err?.data?.message || "Invalid credentials",
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email or Mobile</label>
            <Input
              placeholder="name@example.com or 9876543210"
              {...register("emailOrMobile")}
            />
            {errors.emailOrMobile && (
              <p className="text-sm text-destructive">
                {errors.emailOrMobile.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              placeholder="Enter your password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <a
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:underline"
            >
              Forgot password?
            </a>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <span className="text-muted-foreground">
            Don&apos;t have an account?{" "}
          </span>
          <a href="/register" className="text-primary hover:underline">
            Register
          </a>
        </div>
      </CardContent>
    </Card>
  );
}