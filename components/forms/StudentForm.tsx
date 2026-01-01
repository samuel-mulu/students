'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Student, CreateStudentRequest, UpdateStudentRequest } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const studentSchema = z.object({
  // Personal
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  // Parent
  parentName: z.string().min(1, 'Parent name is required'),
  parentPhone: z.string().min(1, 'Parent phone is required'),
  parentEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  parentRelation: z.string().min(1, 'Parent relation is required'),
  // Address
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  // Emergency
  emergencyName: z.string().min(1, 'Emergency contact name is required'),
  emergencyPhone: z.string().min(1, 'Emergency contact phone is required'),
  emergencyRelation: z.string().min(1, 'Emergency relation is required'),
  // Medical
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  bloodGroup: z.string().optional(),
  // Previous school
  previousSchool: z.string().optional(),
  previousClass: z.string().optional(),
  transferReason: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormProps {
  student?: Student;
  onSubmit: (data: CreateStudentRequest | UpdateStudentRequest) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function StudentForm({ student, onSubmit, onCancel, isLoading }: StudentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: student
      ? {
          firstName: student.firstName,
          lastName: student.lastName,
          dateOfBirth: student.dateOfBirth.split('T')[0],
          gender: student.gender,
          nationality: student.nationality || '',
          religion: student.religion || '',
          email: student.email || '',
          phone: student.phone || '',
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          parentEmail: student.parentEmail || '',
          parentRelation: student.parentRelation,
          address: student.address,
          city: student.city,
          state: student.state || '',
          zipCode: student.zipCode || '',
          country: student.country || '',
          emergencyName: student.emergencyName,
          emergencyPhone: student.emergencyPhone,
          emergencyRelation: student.emergencyRelation,
          medicalConditions: student.medicalConditions || '',
          allergies: student.allergies || '',
          bloodGroup: student.bloodGroup || '',
          previousSchool: student.previousSchool || '',
          previousClass: student.previousClass || '',
          transferReason: student.transferReason || '',
        }
      : undefined,
  });

  const handleFormSubmit = async (data: StudentFormData) => {
    // Clean up empty strings to undefined
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === '' ? undefined : value])
    ) as CreateStudentRequest | UpdateStudentRequest;
    await onSubmit(cleaned);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="parent">Parent</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
              {errors.dateOfBirth && (
                <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={watch('gender')}
                onValueChange={(value) => setValue('gender', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-sm text-destructive">{errors.gender.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" {...register('nationality')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
              <Input id="religion" {...register('religion')} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="parent" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent/Guardian Name *</Label>
              <Input id="parentName" {...register('parentName')} />
              {errors.parentName && (
                <p className="text-sm text-destructive">{errors.parentName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentRelation">Relation *</Label>
              <Select
                value={watch('parentRelation')}
                onValueChange={(value) => setValue('parentRelation', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Mother">Mother</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.parentRelation && (
                <p className="text-sm text-destructive">{errors.parentRelation.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPhone">Parent Phone *</Label>
              <Input id="parentPhone" {...register('parentPhone')} />
              {errors.parentPhone && (
                <p className="text-sm text-destructive">{errors.parentPhone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent Email</Label>
              <Input id="parentEmail" type="email" {...register('parentEmail')} />
              {errors.parentEmail && (
                <p className="text-sm text-destructive">{errors.parentEmail.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyName">Emergency Contact Name *</Label>
              <Input id="emergencyName" {...register('emergencyName')} />
              {errors.emergencyName && (
                <p className="text-sm text-destructive">{errors.emergencyName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyRelation">Emergency Relation *</Label>
              <Input id="emergencyRelation" {...register('emergencyRelation')} />
              {errors.emergencyRelation && (
                <p className="text-sm text-destructive">{errors.emergencyRelation.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Emergency Phone *</Label>
              <Input id="emergencyPhone" {...register('emergencyPhone')} />
              {errors.emergencyPhone && (
                <p className="text-sm text-destructive">{errors.emergencyPhone.message}</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="address" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input id="address" {...register('address')} />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input id="city" {...register('city')} />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register('state')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input id="zipCode" {...register('zipCode')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Input id="bloodGroup" {...register('bloodGroup')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Input id="allergies" {...register('allergies')} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="medicalConditions">Medical Conditions</Label>
              <Input id="medicalConditions" {...register('medicalConditions')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previousSchool">Previous School</Label>
              <Input id="previousSchool" {...register('previousSchool')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previousClass">Previous Class</Label>
              <Input id="previousClass" {...register('previousClass')} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="transferReason">Transfer Reason</Label>
              <Input id="transferReason" {...register('transferReason')} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : student ? 'Update Student' : 'Create Student'}
        </Button>
      </div>
    </form>
  );
}

