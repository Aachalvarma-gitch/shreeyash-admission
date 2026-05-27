import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "./baseQuery";
import { apiUrl } from "./config";

const baseUrl = apiUrl("/superadmin");

export const superadminApi = createApi({
  reducerPath: "superadminApi",
  baseQuery: axiosBaseQuery(baseUrl),
  tagTypes: ["SuperAdminStats", "Admins", "Inquiries", "Courses", "AuditLogs"],
  endpoints: (builder) => ({
    // Dashboard Stats
    getStats: builder.query<any, void>({
      query: () => ({
        url: "/stats",
        method: "GET",
      }),
      providesTags: ["SuperAdminStats"],
    }),

    // Admins (Super Admin only)
    getAdmins: builder.query<any, { page?: number; limit?: number; search?: string }>({
      query: (params) => ({
        url: "/admins",
        method: "GET",
        params,
      }),
      providesTags: ["Admins"],
    }),

    createAdmin: builder.mutation<any, { email: string; password: string; firstName: string; lastName: string; mobile?: string }>({
      query: (adminData) => ({
        url: "/admins",
        method: "POST",
        body: adminData,
      }),
      invalidatesTags: ["Admins"],
    }),

    updateAdmin: builder.mutation<any, { id: string; firstName?: string; lastName?: string; mobile?: string }>({
      query: ({ id, ...body }) => ({
        url: `/admins/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Admins"],
    }),

    deleteAdmin: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admins/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Admins"],
    }),

    // Courses (Super Admin only)
    getCourses: builder.query<any, { page?: number; limit?: number; search?: string }>({
      query: (params) => ({
        url: "/courses",
        method: "GET",
        params,
      }),
      providesTags: ["Courses"],
    }),

    createCourse: builder.mutation<any, { name: string; description?: string; duration?: string; fee?: number }>({
      query: (courseData) => ({
        url: "/courses",
        method: "POST",
        body: courseData,
      }),
      invalidatesTags: ["Courses"],
    }),

    updateCourse: builder.mutation<any, { id: string; name?: string; description?: string; duration?: string; fee?: number }>({
      query: ({ id, ...body }) => ({
        url: `/courses/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Courses"],
    }),

    deleteCourse: builder.mutation<any, string>({
      query: (id) => ({
        url: `/courses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Courses"],
    }),

    // Inquiries (Super Admin only)
    getInquiries: builder.query<any, { status?: string; page?: number; limit?: number; search?: string }>({
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
      invalidatesTags: ["Inquiries"],
    }),

    // Audit Logs (Super Admin only)
    getAuditLogs: builder.query<any, { resource?: string; action?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: "/audit-logs",
        method: "GET",
        params,
      }),
      providesTags: ["AuditLogs"],
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
  useGetAdminsQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
  useGetCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useGetInquiriesQuery,
  useUpdateInquiryMutation,
  useGetAuditLogsQuery,
  useSeedDataMutation,
} = superadminApi;
