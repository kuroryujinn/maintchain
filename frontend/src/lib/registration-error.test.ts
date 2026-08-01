// frontend/src/lib/registration-error.test.ts
// Regression tests for the duplicate-wallet (409) registration handling.
//
// Bug class under test: POST /users with an already-registered stellar_address
// used to return a raw 500 (backend mapped the users_stellar_address_key
// unique violation to INTERNAL_SERVER_ERROR), so a second registration looked
// like a server crash. The backend now returns 409 Conflict (SQLSTATE 23505),
// and these helpers guarantee the frontend treats that 409 as a friendly
// "already registered" case — never a generic failure.

import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import {
  DUPLICATE_REGISTRATION_MESSAGE,
  isDuplicateRegistration,
  registrationErrorMessage,
} from './registration-error';

describe('isDuplicateRegistration', () => {
  it('returns true only for an ApiError with status 409', () => {
    expect(isDuplicateRegistration(new ApiError(409, 'DUPLICATE', 'already registered'))).toBe(true);
  });

  it('returns false for other statuses (500, 404, ...)', () => {
    expect(isDuplicateRegistration(new ApiError(500, 'DB_ERROR', 'db exploded'))).toBe(false);
    expect(isDuplicateRegistration(new ApiError(404, 'NOT_FOUND', 'nope'))).toBe(false);
    expect(isDuplicateRegistration(new ApiError(422, 'BAD_ROLE', 'bad role'))).toBe(false);
  });

  it('returns false for non-ApiError values', () => {
    expect(isDuplicateRegistration(new Error('generic'))).toBe(false);
    expect(isDuplicateRegistration('oops')).toBe(false);
    expect(isDuplicateRegistration(null)).toBe(false);
    expect(isDuplicateRegistration(undefined)).toBe(false);
  });
});

describe('registrationErrorMessage', () => {
  it('maps a 409 to the dedicated already-registered message (never a raw crash)', () => {
    const err = new ApiError(409, 'DUPLICATE', 'duplicate key value violates unique constraint');
    expect(registrationErrorMessage(err)).toBe(DUPLICATE_REGISTRATION_MESSAGE);
  });

  it('surfaces the message for non-409 ApiErrors', () => {
    expect(registrationErrorMessage(new ApiError(500, 'DB_ERROR', 'db exploded'))).toBe('db exploded');
  });

  it('surfaces the message for plain Errors', () => {
    expect(registrationErrorMessage(new Error('network down'))).toBe('network down');
  });

  it('falls back to a generic message for anything else', () => {
    expect(registrationErrorMessage('oops')).toBe('Registration failed. Please try again.');
    expect(registrationErrorMessage(null)).toBe('Registration failed. Please try again.');
  });
});
