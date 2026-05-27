import { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import Axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

import { API_URL } from "./config";

// Token storage (shared across app)
let accessToken = "";
let refreshToken = "";

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
};

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;

export const clearTokens = () => {
  accessToken = "";
  refreshToken = "";
};

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface ApiError {
  message: string;
}

// Axios instance with interceptors
export const axiosInstance = Axios.create({
  baseURL: API_URL,
});

export { axiosInstance as axios };

// Request interceptor to add token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _refreshAttempted?: boolean };

    const isLoginRequest = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/register') || originalRequest?.url?.includes('/auth/send-otp') || originalRequest?.url?.includes('/auth/verify-otp');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isLoginRequest) {
      originalRequest._retry = true;

      try {
        if (originalRequest._refreshAttempted) {
          clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }

        originalRequest._refreshAttempted = true;
        
        const { data } = await Axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken: newAccess, refreshToken: newRefresh } = data.data;
        setTokens(newAccess, newRefresh);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }
        return axiosInstance(originalRequest);
      } catch {
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// RTK Query base query using axios
export const axiosBaseQuery = (
  baseUrl: string = API_URL
): BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> => async (args) => {
  const request = typeof args === "string"
    ? { url: args, method: "GET" as const }
    : args;

  try {
    const body = (request as FetchArgs & { body?: unknown }).body;

    const config: any = {
      baseURL: baseUrl,
      url: request.url,
      method: request.method,
      params: (request as FetchArgs & { params?: Record<string, string> }).params,
    };

    // Handle FormData vs JSON
    if (body instanceof FormData) {
      config.data = body;
      // Let axios set Content-Type with boundary for FormData
      // Remove any existing Content-Type header to let axios set it with boundary
      if (config.headers) {
        delete config.headers['Content-Type'];
      }
    } else {
      config.data = body;
    }

    const result = await axiosInstance(config);

    return { data: result.data };
  } catch (axiosError) {
    const error = axiosError as AxiosError;
    return {
      error: {
        status: error.response?.status || 500,
        data: error.response?.data || error.message,
      } as FetchBaseQueryError,
    };
  }
};
