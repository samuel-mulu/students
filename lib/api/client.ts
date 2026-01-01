import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Cookies are automatically sent with withCredentials: true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Backend returns { success: true, data: {...}, message: "..." }
    // Extract the data field for easier use in components
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const apiResponse = response.data as { success: boolean; data?: any; message?: string };
      // Return the data field if it exists, otherwise return the whole response
      return {
        ...response,
        data: apiResponse.data !== undefined ? apiResponse.data : response.data,
      };
    }
    return response;
  },
  (error: AxiosError<ApiError>) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Clear auth state and redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    // Extract error message from backend response format
    if (error.response?.data) {
      const backendError = error.response.data as ApiError;
      error.message = backendError.error || backendError.message || error.message;
    }

    // Return error with proper typing
    return Promise.reject(error);
  }
);

export default apiClient;

