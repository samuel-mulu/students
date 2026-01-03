import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, CreateUserRequest, UpdateUserRequest } from '@/lib/api/users';
import { User } from '@/lib/types';
import { toast } from 'sonner';

export function useUsers(role?: string) {
  return useQuery({
    queryKey: ['users', role],
    queryFn: async () => {
      const users = await usersApi.getAll(role);
      return { data: users };
    },
  });
}

export function useTeachers() {
  return useQuery({
    queryKey: ['users', 'teachers'],
    queryFn: async () => {
      const teachers = await usersApi.getTeachers();
      return { data: teachers };
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const user = await usersApi.getById(id);
      return { data: user };
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User Created', {
        description: `${user.role} "${user.name}" has been successfully created.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to create user. Please try again.';
      toast.error('Create User Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
      toast.success('User Updated', {
        description: `User "${user.name}" has been successfully updated.`,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to update user. Please try again.';
      toast.error('Update User Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User Deleted', {
        description: 'User has been successfully deleted.',
        duration: 3000,
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.errorMessage ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to delete user. Please try again.';
      toast.error('Delete User Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

