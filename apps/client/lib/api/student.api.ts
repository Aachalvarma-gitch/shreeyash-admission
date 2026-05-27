import { createApi } from "@reduxjs/toolkit/query/react";

import {
  GET_PROFILE_RESPONSE,
  UPDATE_PROFILE_REQUEST,
  UPDATE_PROFILE_RESPONSE,
  CREATE_APPLICATION_REQUEST,
  CREATE_APPLICATION_RESPONSE,
  GET_MY_APPLICATION_RESPONSE,
  UPDATE_APPLICATION_REQUEST,
  UPDATE_APPLICATION_RESPONSE,
  GET_CATEGORIES_RESPONSE,
  GET_COURSES_REQUEST,
  GET_COURSES_RESPONSE,
  GET_ADMISSION_TYPES_RESPONSE,
  UserProfileResponse,
  ApplicationResponse,
  CategoryResponse,
  CourseResponse,
} from "@skillhub/types/user";

import { axiosBaseQuery } from "./baseQuery";
import { apiUrl } from "./config";

const baseUrl = apiUrl("/student");

export const studentApi = createApi({
  reducerPath: "studentApi",
  baseQuery: axiosBaseQuery(baseUrl),
  tagTypes: ["Profile", "Application", "Categories", "Courses", "AdmissionTypes"],
  endpoints: (builder) => ({
    // Public endpoints
    getAdmissionTypes: builder.query<GET_ADMISSION_TYPES_RESPONSE, void>({
      query: () => ({
        url: "/admission-types",
        method: "GET",
      }),
      providesTags: ["AdmissionTypes"],
      transformResponse: (response: GET_ADMISSION_TYPES_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to get admission types",
    }),

    getCategories: builder.query<GET_CATEGORIES_RESPONSE, void>({
      query: () => ({
        url: "/categories",
        method: "GET",
      }),
      providesTags: ["Categories"],
      transformResponse: (response: GET_CATEGORIES_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to get categories",
    }),

    getCourses: builder.query<GET_COURSES_RESPONSE, GET_COURSES_REQUEST>({
      query: (params) => ({
        url: `/courses/${params.categoryId}`,
        method: "GET",
      }),
      providesTags: ["Courses"],
      transformResponse: (response: GET_COURSES_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to get courses",
    }),

    // Protected endpoints
    getProfile: builder.query<GET_PROFILE_RESPONSE, void>({
      query: () => ({
        url: "/profile",
        method: "GET",
      }),
      providesTags: ["Profile"],
      transformResponse: (response: GET_PROFILE_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to get profile",
    }),

    updateProfile: builder.mutation<UPDATE_PROFILE_RESPONSE, UPDATE_PROFILE_REQUEST>({
      query: (profileData) => ({
        url: "/profile",
        method: "PUT",
        body: profileData,
      }),
      invalidatesTags: ["Profile"],
      transformResponse: (response: UPDATE_PROFILE_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Profile update failed",
    }),

    createApplication: builder.mutation<CREATE_APPLICATION_RESPONSE, CREATE_APPLICATION_REQUEST>({
      query: (applicationData) => ({
        url: "/application",
        method: "POST",
        body: applicationData,
      }),
      invalidatesTags: ["Application"],
      transformResponse: (response: CREATE_APPLICATION_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to create application",
    }),

    getMyApplication: builder.query<GET_MY_APPLICATION_RESPONSE, void>({
      query: () => ({
        url: "/application",
        method: "GET",
      }),
      providesTags: ["Application"],
      transformResponse: (response: GET_MY_APPLICATION_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to get application",
    }),

    updateApplication: builder.mutation<UPDATE_APPLICATION_RESPONSE, UPDATE_APPLICATION_REQUEST>({
      query: (applicationData) => ({
        url: "/application",
        method: "PUT",
        body: applicationData,
      }),
      invalidatesTags: ["Application"],
      transformResponse: (response: UPDATE_APPLICATION_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to update application",
    }),

    deleteDocument: builder.mutation<{ data: { type: string } }, string>({
      query: (documentType) => ({
        url: `/documents/${documentType}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Application"],
      transformResponse: (response: { data: { type: string } }) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to delete document",
    }),

    uploadDocument: builder.mutation<{ data: { url: string; publicId: string; type: string } }, { file: File; type: string }>({
      query: ({ file, type }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);
        return {
          url: "/documents/upload",
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (response: any) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to upload document",
    }),
  }),
});

export const {
  useGetAdmissionTypesQuery,
  useGetCategoriesQuery,
  useGetCoursesQuery,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useCreateApplicationMutation,
  useGetMyApplicationQuery,
  useUpdateApplicationMutation,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
} = studentApi;
