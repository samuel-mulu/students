'use client';

import { useState } from 'react';
import { useUsers, useDeleteUser } from '@/lib/hooks/use-users';
import { useClasses, useUpdateClass } from '@/lib/hooks/use-classes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UserFormDialog } from '@/components/forms/UserFormDialog';
import { AssignHeadTeacherDialog } from '@/components/forms/AssignHeadTeacherDialog';
import { User } from '@/lib/types';
import { Users, Plus, Search, GraduationCap } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function UsersPage() {
  const { hasRole } = useAuthStore();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [userDialog, setUserDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [removeClassDialog, setRemoveClassDialog] = useState<{
    open: boolean;
    user: User | null;
    classId: string;
    className: string;
  }>({
    open: false,
    user: null,
    classId: '',
    className: '',
  });

  const { data, isLoading, error, refetch } = useUsers();
  const { data: classesData } = useClasses();
  const deleteUser = useDeleteUser();
  const updateClass = useUpdateClass();

  const users = Array.isArray(data?.data) ? data.data : [];
  const classes = Array.isArray(classesData?.data) ? classesData.data : [];

  // Filter users
  const filteredUsers = users.filter((user: User) => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async () => {
    if (deleteDialog.user) {
      await deleteUser.mutateAsync(deleteDialog.user.id);
      setDeleteDialog({ open: false, user: null });
    }
  };

  const handleAssignHeadTeacher = async (classId: string) => {
    if (assignDialog.user) {
      await updateClass.mutateAsync({
        id: classId,
        data: { headTeacherId: assignDialog.user.id },
      });
      setAssignDialog({ open: false, user: null });
    }
  };

  const handleRemoveFromClass = async () => {
    if (removeClassDialog.classId) {
      await updateClass.mutateAsync({
        id: removeClassDialog.classId,
        data: { headTeacherId: null },
      });
      setRemoveClassDialog({ open: false, user: null, classId: '', className: '' });
    }
  };

  if (!hasRole(['OWNER'])) {
    return (
      <ErrorState message="You don't have permission to access this page. Only Owners can manage users." />
    );
  }

  if (isLoading) {
    return <LoadingState rows={5} columns={4} />;
  }

  if (error) {
    return <ErrorState message="Failed to load users" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
              <Users className="h-8 w-8 text-slate-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Users & Teachers</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage system users and assign head teachers to classes
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => setUserDialog({ open: true, user: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-slate-900">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-slate-200"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="TEACHER">Teachers</SelectItem>
                <SelectItem value="REGISTRAR">Registrars</SelectItem>
                <SelectItem value="OWNER">Owners</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Get started by creating a new user"
          action={{
            label: 'Create User',
            onClick: () => setUserDialog({ open: true, user: null }),
          }}
        />
      ) : (
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-600" />
              <div>
                <CardTitle className="text-slate-900">Users</CardTitle>
                <CardDescription className="text-slate-600">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-lg border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-600 hover:to-slate-700">
                    <TableHead className="text-white font-bold py-4 px-6 border-r border-slate-500">
                      Name
                    </TableHead>
                    <TableHead className="text-white font-bold py-4 px-6 border-r border-slate-500">
                      Email
                    </TableHead>
                    <TableHead className="text-white font-bold py-4 px-6 border-r border-slate-500">
                      Role
                    </TableHead>
                    <TableHead className="text-white font-bold py-4 px-6 border-r border-slate-500">
                      Assigned Classes
                    </TableHead>
                    <TableHead className="text-white font-bold py-4 px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: User, index: number) => {
                    const isEven = index % 2 === 0;
                    return (
                      <TableRow
                        key={user.id}
                        className={`${
                          isEven
                            ? 'bg-white hover:bg-slate-50'
                            : 'bg-gray-50 hover:bg-slate-50'
                        } border-b border-slate-200`}
                      >
                        <TableCell className="font-semibold text-gray-900 py-4 px-6 border-r border-slate-200">
                          {user.name}
                        </TableCell>
                        <TableCell className="py-4 px-6 border-r border-slate-200">
                          {user.email}
                        </TableCell>
                        <TableCell className="py-4 px-6 border-r border-slate-200">
                          <Badge
                            variant={
                              user.role === 'OWNER'
                                ? 'default'
                                : user.role === 'TEACHER'
                                ? 'default'
                                : 'secondary'
                            }
                            className={
                              user.role === 'OWNER'
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : user.role === 'TEACHER'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 border-r border-slate-200">
                          {user.teacherClasses && user.teacherClasses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.teacherClasses.map((cls) => (
                                <Badge
                                  key={cls.id}
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-300 flex items-center gap-1 pr-1"
                                >
                                  <span>{cls.name}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRemoveClassDialog({
                                        open: true,
                                        user,
                                        classId: cls.id,
                                        className: cls.name,
                                      });
                                    }}
                                    className="ml-1 hover:bg-red-100 rounded-full p-0.5 transition-colors flex items-center justify-center w-4 h-4"
                                    disabled={updateClass.isPending}
                                    title={`Remove from ${cls.name}`}
                                  >
                                    <span className="text-red-600 text-xs leading-none font-bold">×</span>
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex gap-2">
                            {user.role === 'TEACHER' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAssignDialog({ open: true, user })}
                              >
                                <GraduationCap className="mr-2 h-4 w-4" />
                                Assign Class
                              </Button>
                            )}
                            {user.role !== 'OWNER' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteDialog({ open: true, user })}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <UserFormDialog
        open={userDialog.open}
        onOpenChange={(open) => setUserDialog({ open, user: userDialog.user })}
        user={userDialog.user}
      />

      <AssignHeadTeacherDialog
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog({ open, user: assignDialog.user })}
        user={assignDialog.user}
        classes={classes}
        onConfirm={handleAssignHeadTeacher}
        isLoading={updateClass.isPending}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, user: deleteDialog.user })}
        title="Delete User"
        description={`Are you sure you want to delete user "${
          deleteDialog.user?.name || 'this user'
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="destructive"
      />

      <ConfirmDialog
        open={removeClassDialog.open}
        onOpenChange={(open) =>
          setRemoveClassDialog({ open, user: removeClassDialog.user, classId: removeClassDialog.classId, className: removeClassDialog.className })
        }
        title="Remove Teacher from Class"
        description={`Are you sure you want to remove ${
          removeClassDialog.user?.name || 'this teacher'
        } from ${removeClassDialog.className}?`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleRemoveFromClass}
        variant="destructive"
      />
    </div>
  );
}

