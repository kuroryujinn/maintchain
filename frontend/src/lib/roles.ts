// frontend/src/lib/roles.ts
// Single source of truth for MaintChain user roles.
//
// MUST stay in sync with the backend CHECK constraint in
// backend/migrations/0004_user_roles.sql:
//
//   role TEXT NOT NULL CHECK (role IN ('TECHNICIAN', 'SUPERVISOR', 'AUDITOR', 'OWNER'))
//
// roles.test.ts asserts this module matches that SQL constraint, so drift
// between the frontend role list and the database is caught in CI.

/** The canonical, ordered list of user roles. */
export const USER_ROLES = ['TECHNICIAN', 'SUPERVISOR', 'AUDITOR', 'OWNER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Allowed roles for selects/forms — must match the DB constraint. */
export const ALLOWED_ROLES: readonly string[] = USER_ROLES;

/**
 * On-chain role codes, matching the IdentityRegistry contract's expectations
 * (used by /get-verified when calling verify_identity).
 */
export const ROLE_CODES: Record<string, number> = {
  TECHNICIAN: 1,
  SUPERVISOR: 2,
  AUDITOR: 3,
  OWNER: 4,
};

export interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
}

/** Role picker options for the registration form. */
export const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'TECHNICIAN',
    label: 'Technician',
    description: 'Field worker who performs maintenance and submits evidence',
  },
  {
    value: 'SUPERVISOR',
    label: 'Supervisor',
    description: 'Site-level manager who verifies evidence and approves work',
  },
  {
    value: 'AUDITOR',
    label: 'Auditor',
    description: 'Compliance officer who issues final certificates',
  },
  {
    value: 'OWNER',
    label: 'Equipment Owner',
    description: 'Company that owns industrial equipment',
  },
];
