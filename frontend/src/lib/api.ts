// frontend/src/lib/api.ts
// Typed fetch wrapper around the MaintChain Rust backend at localhost:8081
// REST API design: plural resource names, proper HTTP methods, structured errors.

import type {
  AuditResponse,
  CreateMaintenanceOrderRequest,
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
  ApiErrorResponse,
} from './api-types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

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

  auditorApprove: (id: string, data: { decision_note?: string }) =>
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
};
