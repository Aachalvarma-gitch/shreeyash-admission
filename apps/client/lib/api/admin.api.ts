import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "./baseQuery";
import { apiUrl } from "./config";

const baseUrl = apiUrl("/admin");

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: axiosBaseQuery(baseUrl),
  tagTypes: ["AdminStats", "Applications", "Inquiries", "Users", "Students", "AuditLogs", "AdmissionTypes"],
  endpoints: (builder) => ({
    // Dashboard Stats
    getStats: builder.query<any, void>({
      query: () => ({
        url: "/stats",
        method: "GET",
      }),
      providesTags: ["AdminStats"],
    }),

    // Applications
    getApplications: builder.query<any, { status?: string; page?: number; limit?: number; search?: string }>({
      query: (params) => ({
        url: "/applications",
        method: "GET",
        params,
      }),
      providesTags: ["Applications"],
    }),

    getApplicationById: builder.query<any, string>({
      query: (id) => ({
        url: `/applications/${id}`,
        method: "GET",
      }),
    }),

    uploadDocument: builder.mutation<any, { id: string; documentType: string; file: File }>({
      query: ({ id, documentType, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);
        return {
          url: `/applications/${id}/documents`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Applications"],
    }),

    updateApplicationStatus: builder.mutation<any, { id: string; status: string; reviewNotes?: string; rejectedReason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/applications/${id}/status`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Applications", "AdminStats"],
    }),

    bulkUpdateStatus: builder.mutation<any, { applicationIds: string[]; status: string }>({
      query: (body) => ({
        url: "/applications/bulk-status",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Applications", "AdminStats"],
    }),

    // Seat Allocation
    allocateSeat: builder.mutation<any, { id: string; priority: string; courseId: string }>({
      query: ({ id, ...body }) => ({
        url: `/applications/${id}/allocate`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Applications", "AdminStats"],
    }),

    waitlistApplication: builder.mutation<any, string>({
      query: (id) => ({
        url: `/applications/${id}/waitlist`,
        method: "POST",
      }),
      invalidatesTags: ["Applications", "AdminStats"],
    }),

    getSeatStatus: builder.query<any, void>({
      query: () => ({
        url: "/courses/seat-status",
        method: "GET",
      }),
    }),

    // Students
    getStudents: builder.query<any, { page?: number; limit?: number; search?: string }>({
      query: (params) => ({
        url: "/students",
        method: "GET",
        params,
      }),
    }),

    // Inquiries
    getInquiries: builder.query<any, { status?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: "/inquiries",
        method: "GET",
        params,
      }),
      providesTags: ["Inquiries"],
    }),

    updateInquiry: builder.mutation<any, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/inquiries/${id}`,
        method: "PUT",
        body: { status: status.toUpperCase() },
      }),
      invalidatesTags: ["Inquiries", "AdminStats"],
    }),

    // Users (Super Admin only)
    getUsers: builder.query<any, { role?: string; page?: number; limit?: number; search?: string }>({
      query: (params) => ({
        url: "/users",
        method: "GET",
        params,
      }),
      providesTags: ["Users"],
    }),

    createUser: builder.mutation<any, { email: string; password: string; firstName: string; lastName: string; mobile?: string; role?: string }>({
      query: (userData) => ({
        url: "/users",
        method: "POST",
        body: userData,
      }),
      invalidatesTags: ["Users"],
    }),

    deleteUser: builder.mutation<any, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),

    toggleUserBlock: builder.mutation<any, string>({
      query: (id) => ({
        url: `/users/${id}/toggle-block`,
        method: "PUT",
      }),
      invalidatesTags: ["Users"],
    }),

    // Audit Logs (Super Admin only)
    getAuditLogs: builder.query<any, { resource?: string; action?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: "/audit-logs",
        method: "GET",
        params,
      }),
    }),

    // Export
    exportApplications: builder.query<any, { format?: string; status?: string }>({
      query: (params) => ({
        url: "/export/applications",
        method: "GET",
        params,
      }),
    }),

    exportInquiries: builder.query<any, { format?: string; status?: string }>({
      query: (params) => ({
        url: "/export/inquiries",
        method: "GET",
        params,
      }),
    }),

    // Profile
    getProfile: builder.query<any, void>({
      query: () => ({
        url: "/profile",
        method: "GET",
      }),
    }),

    updateProfile: builder.mutation<any, { firstName?: string; lastName?: string; mobile?: string }>({
      query: (data) => ({
        url: "/profile",
        method: "PUT",
        body: data,
      }),
    }),

    changePassword: builder.mutation<any, { currentPassword: string; newPassword: string }>({
      query: (data) => ({
        url: "/change-password",
        method: "PUT",
        body: data,
      }),
    }),

    // Admission Types
    getAdmissionTypes: builder.query<any, { page?: number; limit?: number }>({
      query: (params) => ({
        url: "/admission-types",
        method: "GET",
        params,
      }),
      providesTags: ["AdmissionTypes"],
    }),

    getAdmissionTypeById: builder.query<any, string>({
      query: (id) => ({
        url: `/admission-types/${id}`,
        method: "GET",
      }),
      providesTags: ["AdmissionTypes"],
    }),

    createAdmissionType: builder.mutation<any, { name: string; slug: string; description?: string; requiredDocuments?: string[]; optionalDocuments?: string[]; fee?: number; displayOrder?: number }>({
      query: (data) => ({
        url: "/admission-types",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AdmissionTypes"],
    }),

    updateAdmissionType: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/admission-types/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["AdmissionTypes"],
    }),

    deleteAdmissionType: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admission-types/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AdmissionTypes"],
    }),

    // Seed Data (Super Admin only)
    seedData: builder.mutation<any, void>({
      query: () => ({
        url: "/seed-data",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetStatsQuery,
  useGetApplicationsQuery,
  useGetApplicationByIdQuery,
  useUploadDocumentMutation,
  useUpdateApplicationStatusMutation,
  useBulkUpdateStatusMutation,
  useGetStudentsQuery,
  useGetInquiriesQuery,
  useUpdateInquiryMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
  useToggleUserBlockMutation,
  useGetAuditLogsQuery,
  useExportApplicationsQuery,
  useExportInquiriesQuery,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useSeedDataMutation,
  useGetAdmissionTypesQuery,
  useGetAdmissionTypeByIdQuery,
  useCreateAdmissionTypeMutation,
  useUpdateAdmissionTypeMutation,
  useDeleteAdmissionTypeMutation,
  useAllocateSeatMutation,
  useWaitlistApplicationMutation,
  useGetSeatStatusQuery,
} = adminApi;
