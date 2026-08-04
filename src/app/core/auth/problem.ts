import { HttpErrorResponse } from '@angular/common/http';

/**
 * Reads the `.error` payload off an `HttpErrorResponse` — or, defensively,
 * off any error-shaped object carrying one (e.g. a hand-constructed test
 * double), so callers don't need to instantiate a real `HttpErrorResponse`
 * just to exercise this path.
 */
function readProblem(error: unknown): Record<string, unknown> | null {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    return error.error as Record<string, unknown>;
  }
  if (error && typeof error === 'object' && 'error' in error) {
    const inner = (error as { error?: unknown }).error;
    if (inner && typeof inner === 'object') {
      return inner as Record<string, unknown>;
    }
  }
  return null;
}

/** Extracts a Problem-shaped message (RFC 7807, per every kart backend contract) from an HTTP error. */
export function extractErrorMessage(error: unknown, fallback: string): string {
  const problem = readProblem(error);
  if (problem && typeof problem['message'] === 'string' && problem['message'].length > 0) {
    return problem['message'];
  }
  return fallback;
}

/** Extracts the Problem's machine-readable `code`, if present, for callers that branch on it (e.g. 409 escalation-required). */
export function extractErrorCode(error: unknown): string | undefined {
  const problem = readProblem(error);
  if (problem && typeof problem['code'] === 'string') {
    return problem['code'];
  }
  return undefined;
}
