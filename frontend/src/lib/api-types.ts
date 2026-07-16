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
}

export interface RegisterEquipmentRequest {
  equipment_id: string;
  owner_id: string;
  metadata_hash?: string;
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

// ─── Audit ────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  maintenance_id: string;
  approver_id: string;
  role: string;
  decision: string | null;
  approval_timestamp: string;
  note: string | null;
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
