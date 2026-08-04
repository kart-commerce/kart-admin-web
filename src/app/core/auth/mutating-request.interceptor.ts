import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { IdleSessionService } from './idle-session.service';

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Feeds IdleSessionService's in-flight-mutating-request counter
 * (edge-cases.md "Idle-Timeout Warning Countdown Racing an In-Flight
 * Refund-Approval Submit") — every non-idempotent request pauses the idle
 * timer until it resolves, so a slow refund-approval submit is never
 * interrupted by a false-positive idle timeout.
 */
export const mutatingRequestInterceptor: HttpInterceptorFn = (req, next) => {
  if (IDEMPOTENT_METHODS.has(req.method) || req.url.startsWith('/api/bff/auth/')) {
    return next(req);
  }

  const idleSession = inject(IdleSessionService);
  idleSession.beginMutatingRequest();
  return next(req).pipe(finalize(() => idleSession.endMutatingRequest()));
};
