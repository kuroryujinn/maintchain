// frontend/src/lib/api.ts
// Typed fetch wrapper around the MaintChain Rust backend via the Next.js API proxy.
// The browser talks to /api/* on the Next.js server, which forwards to the Rust backend
// with the server-side API key. The browser never hits port 8081 directly.
//
// See: frontend/src/app/api/[...proxy]/route.ts

import type {
  AuditResponse,
  CreateMaintenanceOrderRequest,
  CreateVerificationRequest,
  EquipmentResponse,
  HashRequest,
  HashResponse,
  MaintenanceResponse,
  RegisterEquipmentRequest,
  SubmitEvidenceRequest,
  SupervisorDecisionRequest,
  RegisterUserRequest,
  UserResponse,
  UserCountResponse,
  VerificationReadinessResponse,
  VerificationResponse,
  ApiErrorResponse,
} from './api-types';
import { captureApiError } from './glitchtip';

// The proxy lives at /api/* on the same origin — no NEXT_PUBLIC_* env var needed
const BASE_URL = '/api';

export class ApiError extends Error {
  public code: string;
  public status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = res.statusText;

    try {
      const body = (await res.json()) as ApiErrorResponse;
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // Body is not JSON — use status text
    }

    // Report 5xx server errors to GlitchTip (not 4xx client errors)
    captureApiError(new ApiError(res.status, code, message), {
      method: options?.method || 'GET',
      route: path,
      statusCode: res.status,
      environment: process.env.NODE_ENV || 'production',
    });

    throw new ApiError(res.status, code, message);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  // ─── Health ────────────────────────────────────────
  health: () =>
    request<{ status: string }>('/health'),

  // ─── Equipment ─────────────────────────────────────
  listEquipment: () =>
    request<EquipmentResponse[]>('/equipment'),

  registerEquipment: (data: RegisterEquipmentRequest) =>
    request<void>('/equipment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Maintenance Records ───────────────────────────
  listMaintenance: () =>
    request<MaintenanceResponse[]>('/maintenance'),

  getMaintenance: (id: string) =>
    request<MaintenanceResponse>(`/maintenance/${encodeURIComponent(id)}`),

  createMaintenanceOrder: (data: CreateMaintenanceOrderRequest) =>
    request<MaintenanceResponse>('/maintenance/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submitEvidence: (id: string, data: SubmitEvidenceRequest) =>
    request<MaintenanceResponse>(`/maintenance/${encodeURIComponent(id)}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listPendingApprovals: () =>
    request<MaintenanceResponse[]>('/maintenance/pending'),

  // ─── Supervisor Approvals ──────────────────────────
  supervisorApprove: (id: string, data: SupervisorDecisionRequest) =>
    request<MaintenanceResponse>(`/maintenance/${encodeURIComponent(id)}/approvals/supervisor`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  supervisorReject: (id: string, data: SupervisorDecisionRequest) =>
    request<MaintenanceResponse>(`/maintenance/${encodeURIComponent(id)}/approvals/supervisor/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Audit ─────────────────────────────────────────
  getAuditTrail: (id: string) =>
    request<AuditResponse>(`/maintenance/${encodeURIComponent(id)}/audit`),

  auditorApprove: (id: string, data: import('./api-types').ApproveAuditorRequest) =>
    request<MaintenanceResponse>(`/maintenance/${encodeURIComponent(id)}/approvals/auditor`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Hash Utility ──────────────────────────────────
  computeHash: (data: HashRequest) =>
    request<HashResponse>('/hash/evidence', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Users ─────────────────────────────────────────
  listUsers: () =>
    request<UserResponse[]>('/users'),

  registerUser: (data: RegisterUserRequest) =>
    request<UserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUserByStellar: (stellarAddress: string) =>
    request<UserResponse>(`/users/${encodeURIComponent(stellarAddress)}`),

  userCount: () =>
    request<UserCountResponse>('/users/count'),

  // ─── Verification ─────────────────────────────────
  verificationReadiness: () =>
    request<VerificationReadinessResponse>('/verification/readiness'),

  getVerificationByStellar: (stellarAddress: string) =>
    request<VerificationResponse>(`/verification/${encodeURIComponent(stellarAddress)}`),

  createVerification: (data: CreateVerificationRequest) =>
    request<VerificationResponse>('/verification', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
