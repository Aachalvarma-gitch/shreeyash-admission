"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { useAuthStore } from "@/hooks/use-auth";
import { useGoogleLogin } from "@react-oauth/google";
import { useGoogleLoginMutation } from "@/lib/api/auth.api";

const loginSchema = z.object({
  emailOrMobile: z.string().min(1, "Email or mobile is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", data);
      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);

      if (user.role.name === "Student") {
        router.push("/student/dashboard");
      } else if (user.role.name === "Super Admin") {
        router.push("/superadmin/dashboard");
      } else if (user.role.name === "Admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const [googleLogin, { isLoading: isGoogleLoading }] = useGoogleLoginMutation();
  const googleLoginHook = useGoogleLogin({
    onSuccess: async (credentialResponse: any) => {
      try {
        console.log("Google credential response:", credentialResponse);
        const response: any = await googleLogin({
          token: credentialResponse.credential,
        }).unwrap();
        console.log("Google login response:", response);
        const { user, accessToken, refreshToken } = response.data.data;
        setAuth(user, accessToken, refreshToken);

        if (user.role.name === "Student") {
          router.push("/student/dashboard");
        } else if (user.role.name === "Super Admin") {
          router.push("/superadmin/dashboard");
        } else if (user.role.name === "Admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/");
        }
      } catch (err: any) {
        console.error("Google login error:", err);
        setError(err?.data?.message || "Google login failed. Please try again.");
      }
    },
    onError: (error: any) => {
      console.error("Google login onError:", error);
      setError("Google login failed. Please try again.");
    },
  });

  const handleGoogleLogin = () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      setError("Google login is not configured. Please contact support.");
      return;
    }
    googleLoginHook();
  };

  const handleSendOTP = async (data: LoginForm) => {
    setIsLoading(true);
    setError("");
    try {
      await api.post("/auth/send-otp", { emailOrMobile: data.emailOrMobile });
      setOtpSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 relative mx-auto mb-4">
            <Image
              src="/favicon.webp"
              alt="Shreeyash Pratishthan"
              fill
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

        <div className="flex gap-2 px-6">
          <Button
            type="button"
            variant={loginMethod === "password" ? "default" : "outline"}
            className="flex-1"
            onClick={() => {
              setLoginMethod("password");
              setOtpSent(false);
            }}
          >
            Password
          </Button>
          <Button
            type="button"
            variant={loginMethod === "otp" ? "default" : "outline"}
            className="flex-1"
            onClick={() => {
              setLoginMethod("otp");
              setOtpSent(false);
            }}
          >
            OTP Login
          </Button>
        </div>

        <form onSubmit={handleSubmit(loginMethod === "password" ? onSubmit : handleSendOTP)}>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="emailOrMobile">
                {loginMethod === "otp" ? "Email" : "Email or Mobile"}
              </Label>
              <Input
                id="emailOrMobile"
                type="text"
                placeholder={loginMethod === "otp" ? "Enter your email" : "Enter email or mobile"}
                {...register("emailOrMobile")}
              />
              {errors.emailOrMobile && (
                <p className="text-sm text-destructive">{errors.emailOrMobile.message}</p>
              )}
            </div>

            {loginMethod === "password" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pr-10"
                    {...register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            )}

            {otpSent && loginMethod === "otp" && (
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Please wait...
                </>
              ) : otpSent ? (
                "Verify OTP"
              ) : (
                `Sign in with ${loginMethod === "password" ? "Password" : "OTP"}`
              )}
            </Button>

            <Separator />

            <div className="flex gap-4 w-full">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleGoogleLogin}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.96 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.96 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="font-medium">
                Register here
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
