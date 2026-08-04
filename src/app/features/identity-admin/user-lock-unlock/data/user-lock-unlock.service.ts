import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { UserProfileResponse, UserReadApiService } from '../../../../core/http/generated/user/v1';

/**
 * IDN-1's data layer. Profile lookup (for display context only) reuses
 * kart-user-service's own read path; lock/unlock go through
 * kart-admin-service's `/admin/users/{userId}/lock|unlock` proxy (IDN-1's
 * design source).
 *
 * Gap note: neither kart-identity-service's nor kart-admin-service's
 * contract exposes a way to read a user's *current* lock state — lock/unlock
 * are both fire-and-forget (`200`/`204`, no body reflecting prior state).
 * This screen therefore always offers both actions rather than a single
 * state-reflecting toggle; both are idempotent server-side per their own
 * contracts (re-locking an already-locked user, or re-unlocking an
 * already-unlocked one, is a safe no-op).
 */
@Injectable({ providedIn: 'root' })
export class UserLockUnlockService {
  private readonly userReadApi = inject(UserReadApiService);
  private readonly adminApi = inject(AdminApiService);

  getUserProfile(userId: string): Observable<UserProfileResponse> {
    return this.userReadApi.getUserProfile(userId);
  }

  lockUser(userId: string, reason?: string): Observable<void> {
    return this.adminApi.lockUser(userId, { reason }, crypto.randomUUID()).pipe(map(() => undefined));
  }

  unlockUser(userId: string): Observable<void> {
    return this.adminApi.unlockUser(userId, crypto.randomUUID()).pipe(map(() => undefined));
  }
}
