import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { ApiError } from "@/lib/types";
import { toast } from "sonner";

// Get API URL from environment variables
const getApiUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    if (typeof window !== "undefined") {
      console.warn(
        "NEXT_PUBLIC_API_URL is not set. Using default: http://localhost:4000\n" +
          "Please set NEXT_PUBLIC_API_URL in your .env.local file."
      );
    }
    return "http://localhost:4000";
  }

  // Remove trailing slash if present
  return apiUrl.replace(/\/$/, "");
};

const API_URL = getApiUrl();

// Validate API URL format
if (typeof window !== "undefined" && API_URL) {
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
  withCredentials: true, // Important for cookie-based auth
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout
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
      // Return the data field if it exists, otherwise return the whole response
      return {
        ...response,
        data: apiResponse.data !== undefined ? apiResponse.data : response.data,
      };
    }
    return response;
  },
  (error: AxiosError<ApiError>) => {
    // Extract error message from backend response format
    let errorMessage = "An error occurred";
    let errorDetails: any = null;

    if (error.response?.data) {
      const backendError = error.response.data as ApiError;

      // Backend returns { success: false, error: "...", message: "...", errors: {...} }
      errorMessage =
        backendError.error ||
        backendError.message ||
        error.message ||
        "An error occurred";

      // Handle validation errors - format them clearly
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

    // Store the full error information for hooks to access
    (error as any).errorMessage = errorMessage;
    (error as any).errorDetails = errorDetails;

    // Show toast notification for errors
    // Only show toasts for server errors (500+) and network errors
    // Client errors (400-499) are handled by hooks with specific messages
    if (typeof window !== "undefined") {
      const status = error.response?.status;

      // Show toast for server errors (500+) or network errors (no response)
      if (!status || status >= 500) {
        toast.error("Server Error", {
          description: errorMessage,
          duration: 5000,
        });
      }
      // 401 errors are handled separately with redirect
    }

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Clear auth state and redirect
      if (typeof window !== "undefined") {
        toast.error("Session Expired", {
          description: "Please log in again",
          duration: 3000,
        });
        window.location.href = "/login";
      }
    }

    // Set error message for component handling
    error.message = errorMessage;

    // Return error with proper typing
    return Promise.reject(error);
  }
);

export default apiClient;
