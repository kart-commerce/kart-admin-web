import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AdminActionResult, AdminApiService, GrantCategory, Page } from '../../../../core/http/generated/admin/v1';

export interface AuditTrailQuery {
  adminId?: string;
  category?: GrantCategory;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/**
 * AUD-1's data layer — `GET /admin/actions`, deliberately readable by any
 * Admin-role holder regardless of category grant (requirement-spec.md §3.5;
 * that endpoint's own `403` note: "No fine-grained category check applies
 * to this read-only audit view").
 */
@Injectable({ providedIn: 'root' })
export class AuditTrailService {
  private readonly adminApi = inject(AdminApiService);

  list(query: AuditTrailQuery = {}): Observable<Page<AdminActionResult>> {
    return this.adminApi.listAdminActions(query);
  }
}
