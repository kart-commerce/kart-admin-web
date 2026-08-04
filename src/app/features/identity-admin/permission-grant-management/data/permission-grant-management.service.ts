import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AdminApiService, GrantCategory, Page, PermissionGrant } from '../../../../core/http/generated/admin/v1';

export interface IssueGrantFormValue {
  principalId: string;
  category: GrantCategory;
}

/** IDN-2's data layer — every call goes through kart-admin-service's `/admin/permission-grants` endpoints (its own permission-management meta-category). */
@Injectable({ providedIn: 'root' })
export class PermissionGrantManagementService {
  private readonly adminApi = inject(AdminApiService);

  list(params: { principalId?: string; category?: GrantCategory; includeRevoked?: boolean } = {}): Observable<Page<PermissionGrant>> {
    return this.adminApi.listPermissionGrants(params);
  }

  issue(value: IssueGrantFormValue): Observable<void> {
    return this.adminApi.issuePermissionGrant(value, crypto.randomUUID()).pipe(map(() => undefined));
  }

  revoke(grantId: string, currentVersion: number): Observable<void> {
    return this.adminApi.revokePermissionGrant(grantId, currentVersion, crypto.randomUUID()).pipe(map(() => undefined));
  }
}
