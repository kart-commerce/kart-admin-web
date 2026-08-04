import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { UserProfileResponse, UserReadApiService } from '../../../../core/http/generated/user/v1';

/**
 * SUP-2's data layer — read-only profile/address lookup by known `userId`
 * (requirement-spec.md §3.3, "no full Admin capability"). No user
 * directory/search endpoint exists anywhere in this platform's approved
 * contracts, so a Support Agent locates a userId the same way as this app's
 * other ID-based lookups (e.g. from an order's own `userId`, SUP-1). Every
 * write endpoint on kart-user-service's own contract is scoped
 * `clientCredentials: [self]` (profile-owner only) — this app has no
 * Admin-assisted write action to offer here, only assisted read.
 */
@Injectable({ providedIn: 'root' })
export class CustomerAccountAssistanceService {
  private readonly userReadApi = inject(UserReadApiService);

  getUserProfile(userId: string): Observable<UserProfileResponse> {
    return this.userReadApi.getUserProfile(userId);
  }
}
