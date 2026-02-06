import { ApiError } from "@/lib/types";
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";

const getApiUrl = (): string => {
  // Use relative path for production to support Next.js rewrites by default
  // unless NEXT_PUBLIC_API_URL is explicitly set to an absolute URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (process.env.NODE_ENV === "production") {
    if (apiUrl && apiUrl.startsWith('http')) {
      return apiUrl.replace(/\/$/, "");
    }
    return "";
  }
  
  return (apiUrl || "http://localhost:4000").replace(/\/$/, "");
};

const API_URL = getApiUrl();

// Validate API URL format (only in browser and only for absolute URLs)
if (typeof window !== "undefined" && API_URL && API_URL.startsWith('http')) {
  try {
    new URL(API_URL);
  } catch (error) {
    console.error(
      `Invalid API URL format: ${API_URL}. Please check your NEXT_PUBLIC_API_URL environment variable.`
    );
  }
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // For cookie-based auth
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data
    ) {
      const apiResponse = response.data as {
        success: boolean;
        data?: any;
        message?: string;
      };
      return {
        ...response,
        data: apiResponse.data !== undefined ? apiResponse.data : response.data,
      };
    }
    return response;
  },
  (error: AxiosError<ApiError>) => {
    let errorMessage = "An error occurred";
    let errorDetails: any = null;

    if (error.response?.data) {
      const backendError = error.response.data as ApiError;

      errorMessage =
        backendError.error ||
        backendError.message ||
        error.message ||
        "An error occurred";

      if (backendError.errors && Object.keys(backendError.errors).length > 0) {
        const validationErrors = Object.entries(backendError.errors)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
          .join("\n");
        errorMessage = validationErrors;
        errorDetails = backendError.errors;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    (error as any).errorMessage = errorMessage;
    (error as any).errorDetails = errorDetails;

    if (typeof window !== "undefined") {
      const status = error.response?.status;

      if (!status || status >= 500) {
        toast.error("Server Error", {
          description: errorMessage,
          duration: 5000,
        });
      }
    }

    // Don't auto-redirect on 401 - let the dashboard layout handle it
    // This prevents redirect loops when the auth query fails
    // if (error.response?.status === 401) {
    //   if (typeof window !== "undefined") {
    //     toast.error("Session Expired", {
    //       description: "Please log in again",
    //       duration: 3000,
    //     });
    //     window.location.href = "/login";
    //   }
    // }

    error.message = errorMessage;

    return Promise.reject(error);
  }
);

export default apiClient;
