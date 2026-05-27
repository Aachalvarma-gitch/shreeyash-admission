"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Search, CheckCircle, XCircle, ArrowLeft, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useAuthStore } from "@/hooks/use-auth";

export default function SuperAdminInquiries() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role?.name !== "Super Admin") {
      router.push("/login");
      return;
    }

    const fetchInquiries = async () => {
      try {
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        if (search) params.append("search", search);
        
        const response = await api.get(`/contact/inquiries?${params.toString()}`);
        setInquiries(response.data.data.inquiries || []);
      } catch (error) {
        console.error("Failed to fetch inquiries:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInquiries();
  }, [isAuthenticated, user, router, status, search]);

  const handleResponse = async (inquiryStatus: "RESOLVED" | "REJECTED") => {
    if (!response.trim()) return;
    setResponding(true);
    try {
      await api.put(`/contact/inquiries/${selectedInquiry._id}`, {
        status: inquiryStatus,
        response,
      });
      setInquiries(
        inquiries.map((i) =>
          i._id === selectedInquiry._id
            ? { ...i, status: inquiryStatus, response, respondedAt: new Date() }
            : i
        )
      );
      setSelectedInquiry(null);
      setResponse("");
    } catch (error) {
      console.error("Failed to respond:", error);
    } finally {
      setResponding(false);
    }
  };

  const filteredInquiries = inquiries.filter((inquiry) =>
    inquiry.name.toLowerCase().includes(search.toLowerCase()) ||
    inquiry.email.toLowerCase().includes(search.toLowerCase()) ||
    inquiry.subject.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "RESOLVED":
        return "bg-green-100 text-green-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

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
          <Link href="/superadmin/inquiries" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-600 text-white">
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Inquiries</span>
          </Link>
          <Link href="/superadmin/admins" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition">
            <span className="font-medium">Admins</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <Link href="/superadmin/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-green-600 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Contact Inquiries</h1>
          <p className="text-gray-600">Manage and respond to contact form submissions</p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search inquiries..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Inquiries List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No inquiries found</div>
        ) : (
          <div className="space-y-4">
            {filteredInquiries.map((inquiry) => (
              <div
                key={inquiry._id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{inquiry.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inquiry.status)}`}>
                        {inquiry.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{inquiry.email} • {inquiry.mobile}</p>
                    <p className="font-medium text-gray-900">{inquiry.subject}</p>
                    <p className="text-gray-600 mt-2">{inquiry.message}</p>
                    {inquiry.response && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">Response:</p>
                        <p className="text-gray-600">{inquiry.response}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-4">
                      {new Date(inquiry.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {inquiry.status === "PENDING" && (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedInquiry(inquiry)}
                      className="ml-4"
                    >
                      Respond
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Response Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Respond to Inquiry</h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">From: {selectedInquiry.email}</p>
              <p className="font-medium">{selectedInquiry.subject}</p>
              <p className="text-gray-600 mt-2">{selectedInquiry.message}</p>
            </div>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              rows={4}
              placeholder="Enter your response..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedInquiry(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleResponse("RESOLVED")}
                disabled={responding || !response.trim()}
                className="flex-1 bg-green-600"
              >
                {responding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark Resolved"}
              </Button>
              <Button
                onClick={() => handleResponse("REJECTED")}
                disabled={responding || !response.trim()}
                variant="destructive"
                className="flex-1"
              >
                {responding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}