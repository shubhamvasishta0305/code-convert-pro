// API Service - Connect this to your Python backend
// Update BASE_URL to point to your Python server

import type {
  User,
  Batch,
  Trainee,
  TraineeDetails,
  PendingReview,
  LoginResponse,
  ApiResponse,
} from '@/types/lms';

const BASE_URL = '/api'; // Uses Vite dev-server proxy in local dev

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const raw = await response.text();
  const data = raw ? ((): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  })() : null;

  if (!response.ok) {
    const message =
      (typeof data === 'object' && data && ('message' in data || 'error' in data))
        ? String((data as any).message ?? (data as any).error)
        : response.statusText || 'Request failed';
    throw new Error(`${response.status}: ${message}`);
  }

  return (data as T) ?? ({} as T);
}

// Authentication
export const loginUser = (email: string, password: string): Promise<LoginResponse> =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const registerUser = (name: string, email: string, password: string, role: string): Promise<LoginResponse> =>
  request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });

export const completeSetup = (email: string, password: string): Promise<LoginResponse> =>
  request('/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// Trainers
export const inviteTrainer = (name: string, email: string): Promise<ApiResponse> =>
  request('/trainers/invite', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  });

export const getAllTrainers = (): Promise<Array<{ id: string; name: string }>> =>
  request('/trainers');

// Batches
export const getMyBatches = (userId: string, role: string): Promise<Batch[]> =>
  request(`/batches?userId=${userId}&role=${role}`);

export const createBatch = (data: {
  batch_code: string;
  batch_name: string;
  trainer_id: string;
  start_date: string;
  end_date: string;
  max_capacity: number;
  trainees: Array<{ name: string; mobile?: string; email?: string }>;
}): Promise<ApiResponse> =>
  request('/batches', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Trainees
export const getTraineesByBatch = (batchCode: string): Promise<Trainee[]> =>
  request(`/trainees?batchCode=${batchCode}`);

export const addSingleTrainee = (data: {
  batchCode: string;
  name: string;
  mobile?: string;
  email?: string;
}): Promise<ApiResponse> =>
  request('/trainees', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const bulkAddTrainees = (
  batchCode: string,
  trainees: Array<{ name: string; mobile?: string; email?: string }>
): Promise<{ status: string; added: number }> =>
  request('/trainees/bulk', {
    method: 'POST',
    body: JSON.stringify({ batchCode, trainees }),
  });

export const parseCSVFile = async (
  file: File
): Promise<{ status: string; trainees: Array<{ name: string; mobile: string; email: string }> }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/trainees/parse-csv`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to parse CSV');
  }
  return data;
};

export const getTraineeDetails = (traineeId: string): Promise<{ status: string } & TraineeDetails> =>
  request(`/trainees/${traineeId}`);

// Attendance
export const saveAttendance = (data: {
  batch_code: string;
  date: string;
  records: Array<{ trainee_id: string; status: 'P' | 'A' }>;
}): Promise<ApiResponse> =>
  request('/attendance', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Assessments
export const getTestSetupData = (moduleIndex: string): Promise<{ questions: Array<{ question: string }> }> =>
  request(`/assessments/questions/${moduleIndex}`);

export const saveAssessmentResult = (
  traineeId: string,
  traineeName: string,
  moduleNum: string,
  videoData: { data: string } | null,
  audioData: { data: string } | null
): Promise<{ status: string; attemptCount: number }> =>
  request('/assessments/results', {
    method: 'POST',
    body: JSON.stringify({ traineeId, traineeName, moduleNum, videoData, audioData }),
  });

// Reviews/Grading
export const getPendingReviews = (userId: string, role: string): Promise<PendingReview[]> =>
  request(`/reviews/pending?userId=${userId}&role=${role}`);

export const submitGrade = (resultId: string, score: number): Promise<ApiResponse> =>
  request('/reviews/grade', {
    method: 'POST',
    body: JSON.stringify({ resultId, score }),
  });
