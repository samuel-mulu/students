// User and Auth Types
export type UserRole = "REGISTRAR" | "OWNER" | "TEACHER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  teacherClasses?: Array<{
    id: string;
    name: string;
  }>;
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
export type ClassStatus = "new" | "assigned";
export type PaymentStatus = "pending" | "confirmed";

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
  profileImageUrl?: string;
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
  classId?: string;
  assignClassReason?: string;
  profileImageUrl?: string;
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
  profileImageUrl?: string;
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
  academicYear?: string | AcademicYear; // Legacy string or AcademicYear object when included
  academicYearId?: string;
  gradeId?: string;
  headTeacherId?: string;
  headTeacher?: User;
  grade?: Grade;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassRequest {
  name: string;
  description?: string;
  academicYear?: string; // Legacy support
  academicYearId?: string;
  gradeId?: string;
  headTeacherId?: string;
}

export interface UpdateClassRequest {
  name?: string;
  description?: string;
  academicYear?: string; // Legacy support
  academicYearId?: string;
  gradeId?: string;
  headTeacherId?: string | null;
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
export type AttendanceStatus = "present" | "absent" | "late";

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
  status?: "OPEN" | "CLOSED";
  academicYearId?: string;
  academicYear?: AcademicYear;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTermRequest {
  name: string;
  academicYearId: string;
  startDate?: string;
  endDate?: string;
}

// SubExam Types
export type ExamType = "quiz" | "assignment" | "mid_exam" | "general_test";

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

// PaymentType Types
export interface PaymentType {
  id: string;
  name: string;
  amount: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentTypeRequest {
  name: string;
  amount: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePaymentTypeRequest {
  name?: string;
  amount?: number;
  description?: string;
  isActive?: boolean;
}

// Payment Types
export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  paymentTypeId?: string;
  month: string;
  year: number;
  status: PaymentStatus;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  proofImageUrl?: string;
  transactionNumber?: string;
  student?: Student;
  paymentType?: PaymentType;
  receipt?: Receipt;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  studentId: string;
  paymentTypeId: string; // Required: payment type ID instead of amount
  month: string;
  year: number;
  paymentMethod?: string;
  notes?: string;
  proofImageUrl?: string;
  transactionNumber?: string;
  amount?: number; // Optional for backward compatibility
}

export interface CreateBulkPaymentRequest {
  studentId: string;
  paymentTypeId: string;
  months: string[]; // Array of YYYY-MM format
  paymentMethod?: string;
  notes?: string;
  proofImageUrl?: string;
  transactionNumber?: string;
}

export interface ConfirmPaymentRequest {
  paymentDate?: string;
  paymentMethod?: string;
  proofImageUrl?: string;
  transactionNumber?: string;
}

export interface ConfirmBulkPaymentsRequest {
  paymentIds: string[];
  paymentDate?: string;
  paymentMethod?: string;
  proofImageUrl?: string;
  transactionNumber?: string;
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
  promotionStatus?: "PROMOTED" | "REPEATED" | "GRADUATED";
  class?: Class;
  createdAt: string;
  updatedAt: string;
}

// Grade Types
export interface Grade {
  id: string;
  name: string;
  order: number;
  isHighest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeRequest {
  name: string;
  order: number;
  isHighest?: boolean;
}

export interface UpdateGradeRequest {
  name?: string;
  order?: number;
  isHighest?: boolean;
}

// AcademicYear Types
export type AcademicYearStatus = "ACTIVE" | "CLOSED";

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: AcademicYearStatus;
  createdAt: string;
  updatedAt: string;
  classes?: Class[];
}

export interface CreateAcademicYearRequest {
  name: string;
  startDate: string;
  endDate?: string;
}

export interface UpdateAcademicYearRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
}

// Promotion Types
export interface PromotionPreviewStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  currentClassId: string;
  currentClassName: string;
  currentGradeId: string | null;
  currentGradeName: string | null;
  overallAverage: number;
  outcome: "PASS" | "REPEAT" | "GRADUATE";
  nextGradeId: string | null;
  nextGradeName: string | null;
  nextClassName: string | null;
}

export interface PromotionPreview {
  canPromote: boolean;
  term2Status: string;
  activeAcademicYear: {
    id: string;
    name: string;
  } | null;
  students: PromotionPreviewStudent[];
  summary: {
    total: number;
    passing: number;
    repeating: number;
    graduating: number;
  };
}

export interface PromotionResult {
  message: string;
  promoted: number;
  repeated: number;
  graduated: number;
}

// Settings Types
export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingRequest {
  value: string;
  description?: string;
}
