// User and Auth Types
export type UserRole = 'REGISTRAR' | 'OWNER' | 'TEACHER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
}

// Student Types
export type ClassStatus = 'new' | 'assigned';
export type PaymentStatus = 'pending' | 'confirmed';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality?: string;
  religion?: string;
  email?: string;
  phone?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  parentRelation: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  country?: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  medicalConditions?: string;
  allergies?: string;
  bloodGroup?: string;
  previousSchool?: string;
  previousClass?: string;
  transferReason?: string;
  classStatus: ClassStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality?: string;
  religion?: string;
  email?: string;
  phone?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  parentRelation: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  country?: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  medicalConditions?: string;
  allergies?: string;
  bloodGroup?: string;
  previousSchool?: string;
  previousClass?: string;
  transferReason?: string;
}

export interface UpdateStudentRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  religion?: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentRelation?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  medicalConditions?: string;
  allergies?: string;
  bloodGroup?: string;
  previousSchool?: string;
  previousClass?: string;
  transferReason?: string;
}

export interface AssignClassRequest {
  classId: string;
  reason: string;
}

export interface TransferClassRequest {
  newClassId: string;
  reason: string;
}

export interface StudentsResponse {
  data: Student[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Class Types
export interface Class {
  id: string;
  name: string;
  description?: string;
  academicYear?: string;
  headTeacherId?: string;
  headTeacher?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassRequest {
  name: string;
  description?: string;
  academicYear?: string;
  headTeacherId?: string;
}

export interface UpdateClassRequest {
  name?: string;
  description?: string;
  academicYear?: string;
  headTeacherId?: string;
}

// Subject Types
export interface Subject {
  id: string;
  classId: string;
  name: string;
  code?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectRequest {
  name: string;
  code?: string;
  description?: string;
}

export interface UpdateSubjectRequest {
  name?: string;
  code?: string;
  description?: string;
}

// Attendance Types
export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  student?: Student;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceRequest {
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface BulkAttendanceRequest {
  classId: string;
  date: string;
  attendanceData: {
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
  }[];
}

export interface UpdateAttendanceRequest {
  status?: AttendanceStatus;
  notes?: string;
}

// Term Types
export interface Term {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTermRequest {
  name: string;
}

// SubExam Types
export type ExamType = 'quiz' | 'assignment' | 'mid_exam' | 'general_test';

export interface SubExam {
  id: string;
  subjectId: string;
  termId: string;
  name: string;
  maxScore: number;
  weightPercent: number;
  examType: ExamType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubExamRequest {
  subjectId: string;
  termId: string;
  name: string;
  maxScore: number;
  weightPercent: number;
  examType: ExamType;
}

export interface UpdateSubExamRequest {
  name?: string;
  maxScore?: number;
  weightPercent?: number;
  examType?: ExamType;
}

// Mark Types
export interface Mark {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  termId: string;
  subExamId: string;
  score: number;
  maxScore: number;
  grade?: string;
  notes?: string;
  student?: Student;
  subExam?: SubExam;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarkRequest {
  studentId: string;
  classId: string;
  subjectId: string;
  termId: string;
  subExamId: string;
  score: number;
  notes?: string;
}

export interface RecordMarkRequest {
  score: number;
  notes?: string;
}

export interface UpdateMarkRequest {
  score?: number;
  notes?: string;
}

export interface TermScoreCalculation {
  subExamTotal: number;
  generalTestTotal: number;
  termTotal: number;
  grade: string;
  breakdown: Array<{
    subExamId: string;
    subExamName: string;
    score: number;
    maxScore: number;
    weightPercent: number;
    weightedScore: number;
  }>;
}

export interface YearScoreCalculation {
  term1Total: number;
  term2Total: number;
  yearAverage: number;
  grade: string;
  term1Details: TermScoreCalculation;
  term2Details: TermScoreCalculation;
}

export interface RosterEntry {
  student: Student;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    termTotal?: number;
    yearAverage?: number;
    grade?: string;
  }>;
  overallAverage: number;
  overallGrade: string;
  rank: number;
}

// Payment Types
export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  month: string;
  year: number;
  status: PaymentStatus;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  student?: Student;
  receipt?: Receipt;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  studentId: string;
  amount: number;
  month: string;
  year: number;
  paymentMethod?: string;
  notes?: string;
}

export interface ConfirmPaymentRequest {
  paymentDate?: string;
  paymentMethod?: string;
}

export interface Receipt {
  id: string;
  paymentId: string;
  receiptNumber: string;
  issuedDate: string;
  createdAt: string;
  updatedAt: string;
}

// Report Types
export interface StudentReport {
  student: Student;
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendanceRate: number;
  };
  marks: Array<{
    subjectId: string;
    subjectName: string;
    term1Total?: number;
    term2Total?: number;
    yearAverage?: number;
    grade?: string;
  }>;
  payments: Payment[];
}

export interface ClassReport {
  class: Class;
  students: Student[];
  attendance: {
    totalDays: number;
    averageAttendanceRate: number;
  };
  marks: {
    averageScore: number;
    topStudents: Array<{
      studentId: string;
      studentName: string;
      averageScore: number;
    }>;
  };
}

// API Response Types (matches backend format)
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  errors?: Record<string, string[]>;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// StudentClass History
export interface StudentClass {
  id: string;
  studentId: string;
  classId: string;
  startDate: string;
  endDate?: string;
  reason: string;
  class?: Class;
  createdAt: string;
  updatedAt: string;
}

