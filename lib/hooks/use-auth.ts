import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { LoginRequest, RegisterRequest } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useAuth() {
  const {
    user,
    setUser,
    logout: storeLogout,
    isAuthenticated,
  } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Get current user
  const { data, isLoading, error } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await authApi.getMe();
      setUser(response.user);
      return response.user;
    },
    enabled: !!user, // Only fetch if we have a user (avoids unnecessary calls on login page)
    retry: false,
    refetchOnWindowFocus: false, // Prevent aggressive refetching that causes loops
    staleTime: Infinity, // User data doesn't change often, rely on manual invalidation
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      // Backend returns { user, token } - we only need user for state
      setUser(response.user);
      queryClient.setQueryData(["auth", "me"], response.user);

      toast.success("Login Successful", {
        description: `Welcome back, ${response.user.name}!`,
        duration: 3000,
      });

      // Redirect based on role
      const role = response.user.role;
      if (role === "OWNER" || role === "REGISTRAR") {
        router.push("/dashboard");
      } else if (role === "TEACHER") {
        router.push("/dashboard/attendance");
      }
    },
    onError: (error: any) => {
      // Extract specific error messages for login
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please check your credentials.";

      // Show specific error messages
      if (
        errorMessage.toLowerCase().includes("password") ||
        errorMessage.toLowerCase().includes("incorrect")
      ) {
        toast.error("Invalid Credentials", {
          description:
            "The email or password you entered is incorrect. Please try again.",
          duration: 5000,
        });
      } else if (
        errorMessage.toLowerCase().includes("email") ||
        errorMessage.toLowerCase().includes("user not found")
      ) {
        toast.error("User Not Found", {
          description:
            "No account found with this email address. Please check your email.",
          duration: 5000,
        });
      } else {
        toast.error("Login Failed", {
          description: errorMessage,
          duration: 5000,
        });
      }
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (response) => {
      setUser(response.user);
      queryClient.setQueryData(["auth", "me"], response.user);

      toast.success("Registration Successful", {
        description: `Welcome, ${response.user.name}!`,
        duration: 3000,
      });

      router.push("/dashboard");
    },
    onError: (error: any) => {
      // Error toast is handled by API client interceptor, but we can add specific handling here
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Registration failed. Please try again.";

      if (
        errorMessage.toLowerCase().includes("email") &&
        errorMessage.toLowerCase().includes("already")
      ) {
        toast.error("Email Already Exists", {
          description:
            "An account with this email already exists. Please use a different email.",
          duration: 5000,
        });
      } else {
        toast.error("Registration Failed", {
          description: errorMessage,
          duration: 5000,
        });
      }
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      storeLogout();
      queryClient.clear();

      toast.success("Logged Out", {
        description: "You have been successfully logged out.",
        duration: 3000,
      });

      router.push("/login");
    },
    onError: (error: any) => {
      // Even if logout fails, clear local state
      storeLogout();
      queryClient.clear();
      router.push("/login");

      toast.error("Logout Error", {
        description:
          "There was an error logging out, but you have been signed out locally.",
        duration: 3000,
      });
    },
  });

  return {
    user: data || user,
    isLoading,
    error,
    isAuthenticated: !!user || !!data,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: () => logoutMutation.mutate(),
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
