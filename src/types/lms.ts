// LMS Type Definitions

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Trainer';
}

export interface Batch {
  code: string;
  name: string;
  trainerId: string;
  startDate: string;
  endDate: string;
  maxCapacity: number;
}

export interface Trainee {
  id: string;
  batchCode: string;
  name: string;
  mobile: string;
  email: string;
}

export interface AttendanceRecord {
  recordId: string;
  batchCode: string;
  traineeId: string;
  date: string;
  status: 'P' | 'A';
}

export interface Question {
  moduleId: string;
  moduleName: string;
  questionText: string;
}

export interface AssessmentResult {
  resultId: string;
  traineeId: string;
  traineeName: string;
  moduleNum: string;
  videoLink: string;
  audioLink: string;
  attemptCount: number;
  score: string;
  timestamp: string;
}

export interface TraineeDetails {
  info: {
    id: string;
    batch: string;
    name: string;
    mobile: string;
    email: string;
  };
  stats: {
    total: number;
    percentage: number;
  };
  modules: Record<string, { score: string; attempts: number }>;
  curriculum: Array<{ name: string; modules: (string | number)[] }>;
}

export interface PendingReview {
  resultId: string;
  traineeName: string;
  moduleNum: string;
  videoLink: string;
  audioLink: string;
  attempt: number;
  date: string;
}

export interface LoginResponse {
  status: 'success' | 'error';
  message?: string;
  user?: User;
}

export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
}
