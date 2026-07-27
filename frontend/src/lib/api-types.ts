// frontend/src/lib/api-types.ts
// Typed request/response schemas for the MaintChain REST API (backend port 8081)
// Follows REST API design patterns: plural nouns, proper HTTP methods, structured errors.

/** Unified error response from the backend */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

// ─── Equipment ───────────────────────────────────────────────

export interface EquipmentResponse {
  equipment_id: string;
  owner_id: string;
  metadata_hash: string | null;
  serial_number: string | null;
  name: string | null;
  location: string | null;
}

export interface RegisterEquipmentRequest {
  equipment_id: string;
  owner_id: string;
  metadata_hash?: string;
  serial_number?: string;
  name?: string;
  location?: string;
}

// ─── Maintenance Records ─────────────────────────────────────

export interface MaintenanceResponse {
  maintenance_id: string;
  equipment_id: string;
  technician_id: string;
  status: string;
  evidence_hash: string;
  created_at: string;
}

export interface CreateMaintenanceOrderRequest {
  equipment_id: string;
  technician_id: string;
}

export interface SubmitEvidenceRequest {
  evidence_hash: string;
}

export interface SupervisorDecisionRequest {
  decision_note?: string;
}

export interface ApproveAuditorRequest {
  decision_note?: string;
  transaction_hash?: string;
}

// ─── Audit ────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  maintenance_id: string;
  approver_id: string;
  role: string;
  decision: string | null;
  approval_timestamp: string;
  note: string | null;
  on_chain_tx_id: string | null;
}

export interface AuditResponse {
  maintenance: MaintenanceResponse;
  events: AuditEvent[];
}

export interface HashRequest {
  payload: string;
}

export interface HashResponse {
  evidence_hash: string;
}

// ─── Users ────────────────────────────────────────────────────

export interface UserResponse {
  id: string;
  stellar_address: string | null;
  name: string;
  role: string;
  organization: string | null;
  created_at: string;
}

export interface RegisterUserRequest {
  stellar_address: string;
  name: string;
  role: string;
  organization?: string;
}

export interface UserCountResponse {
  total_users: number;
}

// ─── Verification ─────────────────────────────────────────────

export interface VerificationReadinessResponse {
  database_ready: boolean;
  identity_registry_configured: boolean;
}

export interface VerificationResponse {
  id: string;
  user_id: string;
  stellar_address: string;
  role: string;
  organization: string | null;
  profile_hash: string;
  organization_hash: string;
  verification_tx_hash: string;
  verification_contract_id: string;
  verified_at: string;
  network: string;
  created_at: string;
}

export interface CreateVerificationRequest {
  stellar_address: string;
  role: string;
  organization?: string;
  profile_hash: string;
  organization_hash: string;
  verification_tx_hash: string;
  verified_at: string;
  network: string;
}
