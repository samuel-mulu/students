import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";

const getApiUrl = (): string => {
  // In production use environment variable, else localhost fallback
  const url =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000";

  // Remove trailing slash if any (important!)
  return url.replace(/\/$/, "");
};

const API_URL = getApiUrl();

// Validate API URL format (only in browser)
if (typeof window !== "undefined" && API_URL.startsWith("http")) {
  try {
    new URL(API_URL);
  } catch {
    console.error(
      `Invalid API URL format: ${API_URL}. Please check NEXT_PUBLIC_API_URL environment variable.`
    );
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL, // NO trailing /api here!
  withCredentials: true, // for cookie-based auth
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    // If API uses { success, data, message } wrapper, unwrap it here
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
        data:
          apiResponse.data !== undefined
            ? apiResponse.data
            : response.data,
      };
    }
    return response;
  },
  (error: AxiosError) => {
    let errorMessage = "An error occurred";
    let errorDetails: any = null;

    if (error.response?.data) {
      const backendError = error.response.data as any;

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

    // Do NOT auto redirect on 401 here, let UI handle it

    error.message = errorMessage;

    return Promise.reject(error);
  }
);

export default apiClient;
