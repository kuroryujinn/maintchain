// frontend/src/lib/registration-error.ts
// Shared classification of registration failures.
//
// Bug class under test: POST /users with an already-registered wallet used to
// return a raw 500 (backend mapped the unique-constraint violation
// users_stellar_address_key to INTERNAL_SERVER_ERROR), making a second
// registration look like a server crash. The backend now returns 409 Conflict
// for SQLSTATE 23505; these helpers centralize how the frontend detects and
// words that case so a duplicate never falls through to the generic failure
// path again. See backend/src/main.rs register_user.

import { ApiError } from './api';

/** Friendly copy for the duplicate-registration (409) case. */
export const DUPLICATE_REGISTRATION_MESSAGE =
  'This wallet is already registered. Go to the Dashboard to view your profile.';

/** True when the backend rejected the request because the wallet is already registered. */
export function isDuplicateRegistration(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 409;
}

/**
 * Classify a registration failure into a user-facing message.
 * A 409 (duplicate wallet) gets the dedicated copy; other ApiErrors and Errors
 * surface their message; anything else gets a generic fallback.
 */
export function registrationErrorMessage(err: unknown): string {
  if (isDuplicateRegistration(err)) return DUPLICATE_REGISTRATION_MESSAGE;
  if (err instanceof Error) return err.message;
  return 'Registration failed. Please try again.';
}
