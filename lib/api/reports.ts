import apiClient from './client';

export interface PaymentReportsParams {
  academicYearId?: string;
  paymentTypeId?: string;
  month?: string; // YYYY-MM format
  registrarId?: string;
  paymentMethod?: string; // cash, bank_transfer, card
}

export interface PaymentReportsSummary {
  totalRevenue: number;
  monthlyRevenue: number;
  paymentCount: number;
  confirmedPaymentCount: number;
  totalStudents: number;
  paidStudents: number;
  paymentProgress: number; // Percentage
}

export interface MonthlyBreakdown {
  month: string;
  amount: number;
  count: number;
}

export interface PaymentTypeReport {
  paymentTypeId: string;
  paymentTypeName: string;
  totalAmount: number;
  monthlyBreakdown: MonthlyBreakdown[];
}

export interface MonthReport {
  month: string;
  totalAmount: number;
  paymentCount: number;
  breakdown: Array<{
    paymentTypeId: string;
    paymentTypeName: string;
    amount: number;
  }>;
  totalStudents?: number;
  paidStudents?: number;
  unpaidStudents?: number;
  paymentProgress?: number; // Percentage
}

export interface PaymentReportsResponse {
  summary: PaymentReportsSummary;
  byPaymentType: PaymentTypeReport[];
  byMonth: MonthReport[];
}

export interface RegistrarPaymentReportsParams {
  academicYearId: string;
  paymentTypeId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  paymentMethod?: string; // cash, bank_transfer, card
  month?: string; // YYYY-MM format
}

export interface RegistrarPaymentReportsSummary {
  totalRevenue: number;
  todayRevenue: number;
  paymentCount: number;
}

export interface DateBreakdown {
  paymentTypeId: string;
  paymentTypeName: string;
  amount: number;
  count: number;
}

export interface DateReport {
  date: string; // YYYY-MM-DD
  totalAmount: number;
  paymentCount: number;
  breakdown: DateBreakdown[];
}

export interface RegistrarPaymentReportsResponse {
  summary: RegistrarPaymentReportsSummary;
  byDate: DateReport[];
}

export interface StudentReportResponse {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    classStatus: string;
    paymentStatus: string;
  };
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
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
  payments: Array<{
    id: string;
    month: string;
    year: number;
    amount: number;
    status: string;
    paymentDate?: string;
  }>;
}

export interface ClassReportResponse {
  class: {
    id: string;
    name: string;
  };
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    classStatus: string;
  }>;
  studentCount: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  attendance: {
    averageAttendanceRate: number;
  };
  marks: {
    averageScore: number;
  };
}

export const reportsApi = {
  getPaymentReports: async (params?: PaymentReportsParams): Promise<PaymentReportsResponse> => {
    const response = await apiClient.get<PaymentReportsResponse>('/api/reports/payments', { params });
    return response.data;
  },
  getRegistrarPaymentReports: async (params: RegistrarPaymentReportsParams): Promise<RegistrarPaymentReportsResponse> => {
    const response = await apiClient.get<RegistrarPaymentReportsResponse>('/api/reports/payments/registrar', { params });
    return response.data;
  },
  getStudentReport: async (studentId: string): Promise<StudentReportResponse> => {
    const response = await apiClient.get<StudentReportResponse>(`/api/reports/student/${studentId}`);
    return response.data;
  },
  getClassReport: async (classId: string, term?: string, page?: number, limit?: number): Promise<ClassReportResponse> => {
    const params = {
      ...(term ? { term } : {}),
      ...(page ? { page } : {}),
      ...(limit ? { limit } : {}),
    };
    const response = await apiClient.get<any>(`/api/reports/class/${classId}`, { params });
    const backendData = response.data;
    // Transform backend response to match frontend expectations
    return {
      class: backendData.class,
      students: backendData.students || [],
      studentCount: backendData.studentCount || 0,
      pagination: backendData.pagination,
      attendance: {
        averageAttendanceRate: backendData.attendanceSummary?.averageAttendanceRate || 0,
      },
      marks: {
        averageScore: backendData.academicSummary?.averageScore || 0,
      },
    };
  },
};
