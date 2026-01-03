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
import { MoreHorizontal, Edit, Trash2, UserPlus, Eye, ArrowRightLeft } from 'lucide-react';
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
  // Helper function to get current class name
  const getCurrentClassName = (student: Student): string => {
    // Check if student has classHistory with class information
    if ('classHistory' in student && Array.isArray(student.classHistory)) {
      const activeClass = student.classHistory.find((ch: any) => !ch.endDate);
      if (activeClass?.class?.name) {
        return activeClass.class.name;
      }
    }
    // Fallback to classStatus if no class info available
    return student.classStatus === 'assigned' ? 'Not Assigned' : 'New';
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">
              NO
            </TableHead>
            <TableHead>
              Student Name
            </TableHead>
            <TableHead>
              Class
            </TableHead>
            {showActions && (
              <TableHead>
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={showActions ? 4 : 3} 
                className="text-center py-12 text-gray-500 text-sm"
              >
                No students found
              </TableCell>
            </TableRow>
          ) : (
            students.map((student, index) => {
              const currentClassName = getCurrentClassName(student);
              
              return (
                <TableRow 
                  key={student.id}
                >
                  <TableCell className="text-center font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <h3 className="font-semibold">{formatFullName(student.firstName, student.lastName)}</h3>
                  </TableCell>
                  <TableCell>
                    {currentClassName === 'New' || currentClassName === 'Not Assigned' ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                        {currentClassName}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-blue-100 text-blue-800 border border-blue-300 font-medium">
                        {currentClassName}
                      </Badge>
                    )}
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/students/${student.id}`}>
                          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-[#C3EBFA] hover:bg-[#A8D8E8] transition-colors" title="View Details">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        {onDelete && (
                          <button 
                            onClick={() => onDelete(student)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#CFCEFF]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {(onEdit || onAssignClass || onTransferClass) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-200">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                                  Transfer Class
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

