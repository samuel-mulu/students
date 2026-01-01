import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { LoginRequest, RegisterRequest } from "@/lib/types";
import { useRouter } from "next/navigation";

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
    enabled: isAuthenticated,
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      // Backend returns { user, token } - we only need user for state
      setUser(response.user);
      queryClient.setQueryData(["auth", "me"], response.user);
      // Redirect based on role
      const role = response.user.role;
      if (role === "OWNER" || role === "REGISTRAR") {
        router.push("/dashboard");
      } else if (role === "TEACHER") {
        router.push("/dashboard/attendance");
      }
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (response) => {
      setUser(response.user);
      queryClient.setQueryData(["auth", "me"], response.user);
      router.push("/dashboard");
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      storeLogout();
      queryClient.clear();
      router.push("/login");
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
