"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactForm) => {
    setIsLoading(true);
    setError("");
    try {
      await api.post("/contact/inquiries", data);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to submit inquiry");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Thank You</CardTitle>
              <CardDescription>Your inquiry has been submitted successfully.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/student/dashboard">
                <Button>Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Contact Us</h1>

        <Card>
          <CardHeader>
            <CardTitle>Inquiry Form</CardTitle>
            <CardDescription>Send your question and we will get back to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input id="mobile" {...register("mobile")} />
                  {errors.mobile ? <p className="text-sm text-destructive">{errors.mobile.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" {...register("subject")} />
                  {errors.subject ? <p className="text-sm text-destructive">{errors.subject.message}</p> : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" rows={5} {...register("message")} />
                {errors.message ? <p className="text-sm text-destructive">{errors.message.message}</p> : null}
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Inquiry
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Direct Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Phone: +91 98765 43210</p>
            <p>Email: info@sycet.org</p>
            <p>Location: Mumbai, India</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}