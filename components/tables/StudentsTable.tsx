'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Student } from '@/lib/types';
import { formatFullName } from '@/lib/utils/format';
import { MoreHorizontal, Edit, Trash2, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StudentsTableProps {
  students: Student[];
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
  onAssignClass?: (student: Student) => void;
  onTransferClass?: (student: Student) => void;
  showActions?: boolean;
}

export function StudentsTable({
  students,
  onEdit,
  onDelete,
  onAssignClass,
  onTransferClass,
  showActions = true,
}: StudentsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Class Status</TableHead>
            <TableHead>Payment Status</TableHead>
            {showActions && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="text-center py-8 text-muted-foreground">
                No students found
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/dashboard/students/${student.id}`}
                    className="hover:underline"
                  >
                    {formatFullName(student.firstName, student.lastName)}
                  </Link>
                </TableCell>
                <TableCell>{student.email || '-'}</TableCell>
                <TableCell>{student.phone || '-'}</TableCell>
                <TableCell>
                  <Badge
                    variant={student.classStatus === 'assigned' ? 'default' : 'secondary'}
                  >
                    {student.classStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={student.paymentStatus === 'confirmed' ? 'default' : 'secondary'}
                  >
                    {student.paymentStatus}
                  </Badge>
                </TableCell>
                {showActions && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/students/${student.id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(student)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onAssignClass && student.classStatus === 'new' && (
                          <DropdownMenuItem onClick={() => onAssignClass(student)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assign Class
                          </DropdownMenuItem>
                        )}
                        {onTransferClass && student.classStatus === 'assigned' && (
                          <DropdownMenuItem onClick={() => onTransferClass(student)}>
                            Transfer Class
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(student)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

