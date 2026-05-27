import { createApi } from "@reduxjs/toolkit/query/react";

import type {
  LOGIN_REQUEST,
  LOGIN_RESPONSE,
  REGISTER_REQUEST,
  REGISTER_RESPONSE,
  GOOGLE_LOGIN_REQUEST,
  GOOGLE_LOGIN_RESPONSE,
  SEND_OTP_REQUEST,
  SEND_OTP_RESPONSE,
  VERIFY_OTP_LOGIN_REQUEST,
  VERIFY_OTP_LOGIN_RESPONSE,
  REFRESH_TOKEN_REQUEST,
  REFRESH_TOKEN_RESPONSE,
  FORGOT_PASSWORD_REQUEST,
  FORGOT_PASSWORD_RESPONSE,
  RESET_PASSWORD_REQUEST,
  RESET_PASSWORD_RESPONSE,
  CHANGE_PASSWORD_REQUEST,
  CHANGE_PASSWORD_RESPONSE,
  GET_PROFILE_RESPONSE,
  UserResponse,
} from "@skillhub/types/auth";

import { UPDATE_PROFILE_REQUEST, UPDATE_PROFILE_RESPONSE } from "@skillhub/types/user";

import { axiosBaseQuery } from "./baseQuery";
import { apiUrl } from "./config";

const baseUrl = apiUrl("/auth");

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: axiosBaseQuery(baseUrl),
  tagTypes: ["Auth", "Profile"],
  endpoints: (builder) => ({
    login: builder.mutation<LOGIN_RESPONSE, LOGIN_REQUEST>({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
      transformResponse: (response: LOGIN_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Login failed",
    }),

    register: builder.mutation<REGISTER_RESPONSE, REGISTER_REQUEST>({
      query: (userData) => ({
        url: "/register",
        method: "POST",
        body: userData,
      }),
      transformResponse: (response: REGISTER_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Registration failed",
    }),

    googleLogin: builder.mutation<GOOGLE_LOGIN_RESPONSE, GOOGLE_LOGIN_REQUEST>({
      query: (googleData) => ({
        url: "/google",
        method: "POST",
        body: googleData,
      }),
      transformResponse: (response: GOOGLE_LOGIN_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Google login failed",
    }),

    sendOTP: builder.mutation<SEND_OTP_RESPONSE, SEND_OTP_REQUEST>({
      query: (data) => ({
        url: "/send-otp",
        method: "POST",
        body: data,
      }),
      transformResponse: (response: SEND_OTP_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to send OTP",
    }),

    verifyOTP: builder.mutation<VERIFY_OTP_LOGIN_RESPONSE, VERIFY_OTP_LOGIN_REQUEST>({
      query: (data) => ({
        url: "/verify-otp",
        method: "POST",
        body: data,
      }),
      transformResponse: (response: VERIFY_OTP_LOGIN_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "OTP verification failed",
    }),

    refreshToken: builder.mutation<REFRESH_TOKEN_RESPONSE, REFRESH_TOKEN_REQUEST>({
      query: (data) => ({
        url: "/refresh-token",
        method: "POST",
        body: data,
      }),
      transformResponse: (response: REFRESH_TOKEN_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Token refresh failed",
    }),

    forgotPassword: builder.mutation<FORGOT_PASSWORD_RESPONSE, FORGOT_PASSWORD_REQUEST>({
      query: (email) => ({
        url: "/forgot-password",
        method: "POST",
        body: email,
      }),
      transformResponse: (response: FORGOT_PASSWORD_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Failed to send reset password email",
    }),

    resetPassword: builder.mutation<RESET_PASSWORD_RESPONSE, RESET_PASSWORD_REQUEST>({
      query: (data) => ({
        url: "/reset-password",
        method: "POST",
        body: data,
      }),
      transformResponse: (response: RESET_PASSWORD_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Password reset failed",
    }),

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

    changePassword: builder.mutation<CHANGE_PASSWORD_RESPONSE, CHANGE_PASSWORD_REQUEST>({
      query: (passwordData) => ({
        url: "/change-password",
        method: "POST",
        body: passwordData,
      }),
      transformResponse: (response: CHANGE_PASSWORD_RESPONSE) => response,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Password change failed",
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth", "Profile"],
      transformResponse: () => undefined,
      transformErrorResponse: (error: { status: number; data: { message: string } }) =>
        error.data?.message || "Logout failed",
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
  useSendOTPMutation,
  useVerifyOTPMutation,
  useRefreshTokenMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useLogoutMutation,
} = authApi;
