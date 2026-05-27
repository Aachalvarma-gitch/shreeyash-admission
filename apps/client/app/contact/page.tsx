"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, MapPin, Phone, Mail, Home } from "lucide-react";
import Image from "next/image";

import api from "@/lib/api";
import { useShowToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

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
  const { showToast } = useShowToast();

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
      showToast({
        title: "Inquiry Submitted",
        description: "Thank you! We will get back to you within 24-48 hours.",
        severity: "success",
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to submit inquiry";
      setError(message);
      showToast({
        title: "Error",
        description: message,
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Send className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription className="text-base">
              Your inquiry has been submitted successfully. We will get back to you within 24-48 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Link href="/">
              <Button variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Image src="/favicon.webp" alt="Shreeyash Pratishthan" width={80} height={80} className="object-contain" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Contact Us</h1>
          <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto">
            Have a question or need assistance? We are here to help. Fill out the form below and our team will get back to you shortly.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="lg:col-span-2">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-black">Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form and we will get back to you shortly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {error ? (
                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</p>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="Your full name" className="text-black" {...register("name")} />
                      {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your@email.com" className="text-black" {...register("email")} />
                      {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile</Label>
                      <Input id="mobile" placeholder="+91 98765 43210" className="text-black" {...register("mobile")} />
                      {errors.mobile ? <p className="text-sm text-destructive">{errors.mobile.message}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="How can we help?" className="text-black" {...register("subject")} />
                      {errors.subject ? <p className="text-sm text-destructive">{errors.subject.message}</p> : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" rows={5} placeholder="Tell us more about your inquiry..." className="text-black" {...register("message")} />
                    {errors.message ? <p className="text-sm text-destructive">{errors.message.message}</p> : null}
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Submit Inquiry
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    Gut No.258(P), Satara Parisar,<br />
                    Beed Bypass Road, Near SRPF Camp,<br />
                    Tal. & Dist. Chhatrapati Sambhajinagar,<br />
                    Maharashtra 431105
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-600">+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-600">info@sycet.org</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Office Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
                <p>Saturday: 9:00 AM - 1:00 PM</p>
                <p>Sunday: Closed</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
