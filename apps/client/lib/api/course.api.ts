import { createApi } from "@reduxjs/toolkit/query/react";

import {
  GET_PUBLIC_CATEGORIES_RESPONSE,
  GET_PUBLIC_COURSES_REQUEST,
  GET_PUBLIC_COURSES_RESPONSE,
  GET_CATEGORIES_RESPONSE,
  GET_COURSES_REQUEST,
  GET_COURSES_RESPONSE,
  CREATE_CATEGORY_REQUEST,
  CREATE_CATEGORY_RESPONSE,
  UPDATE_CATEGORY_REQUEST,
  UPDATE_CATEGORY_RESPONSE,
  DELETE_CATEGORY_RESPONSE,
  CREATE_COURSE_REQUEST,
  CREATE_COURSE_RESPONSE,
  UPDATE_COURSE_REQUEST,
  UPDATE_COURSE_RESPONSE,
  DELETE_COURSE_RESPONSE,
} from "@skillhub/types/course";

import { axiosBaseQuery } from "./baseQuery";
import { apiUrl } from "./config";

const baseUrl = apiUrl("/courses");

export const courseApi = createApi({
  reducerPath: "courseApi",
  baseQuery: axiosBaseQuery(baseUrl),
  tagTypes: ["Categories", "Courses"],
  endpoints: (builder) => ({
    // Public endpoints
    getPublicCategories: builder.query<GET_PUBLIC_CATEGORIES_RESPONSE, void>({
      query: () => ({
        url: "/public/categories",
        method: "GET",
      }),
      providesTags: ["Categories"],
      transformResponse: (response: GET_PUBLIC_CATEGORIES_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to get categories",
    }),

    getPublicCourses: builder.query<GET_PUBLIC_COURSES_RESPONSE, GET_PUBLIC_COURSES_REQUEST>({
      query: (params) => ({
        url: `/public/courses/${params.categoryId}`,
        method: "GET",
      }),
      providesTags: ["Courses"],
      transformResponse: (response: GET_PUBLIC_COURSES_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to get courses",
    }),

    // Protected endpoints (Admin)
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

    getCourses: builder.query<GET_COURSES_RESPONSE, GET_COURSES_REQUEST | void>({
      query: (params) => ({
        url: "/courses",
        method: "GET",
        params: params || {},
      }),
      providesTags: ["Courses"],
      transformResponse: (response: GET_COURSES_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to get courses",
    }),

    createCategory: builder.mutation<CREATE_CATEGORY_RESPONSE, CREATE_CATEGORY_REQUEST>({
      query: (categoryData) => ({
        url: "/categories",
        method: "POST",
        body: categoryData,
      }),
      invalidatesTags: ["Categories"],
      transformResponse: (response: CREATE_CATEGORY_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to create category",
    }),

    updateCategory: builder.mutation<UPDATE_CATEGORY_RESPONSE, { id: string; data: UPDATE_CATEGORY_REQUEST }>({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Categories"],
      transformResponse: (response: UPDATE_CATEGORY_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to update category",
    }),

    deleteCategory: builder.mutation<DELETE_CATEGORY_RESPONSE, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories"],
      transformResponse: (response: DELETE_CATEGORY_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to delete category",
    }),

    createCourse: builder.mutation<CREATE_COURSE_RESPONSE, CREATE_COURSE_REQUEST>({
      query: (courseData) => ({
        url: "/courses",
        method: "POST",
        body: courseData,
      }),
      invalidatesTags: ["Courses"],
      transformResponse: (response: CREATE_COURSE_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to create course",
    }),

    updateCourse: builder.mutation<UPDATE_COURSE_RESPONSE, { id: string; data: UPDATE_COURSE_REQUEST }>({
      query: ({ id, data }) => ({
        url: `/courses/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Courses"],
      transformResponse: (response: UPDATE_COURSE_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to update course",
    }),

    deleteCourse: builder.mutation<DELETE_COURSE_RESPONSE, string>({
      query: (id) => ({
        url: `/courses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Courses"],
      transformResponse: (response: DELETE_COURSE_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to delete course",
    }),
  }),
});

export const {
  useGetPublicCategoriesQuery,
  useGetPublicCoursesQuery,
  useGetCategoriesQuery,
  useGetCoursesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
} = courseApi;
