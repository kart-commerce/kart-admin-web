import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AdminApiService, Page, PrivacyRequest, PrivacyRequestStatus } from '../../../../core/http/generated/admin/v1';

/** AUD-3's data layer — see `PrivacyRequest`'s doc comment (admin/v1 models) for this endpoint's assumed-extension status. */
@Injectable({ providedIn: 'root' })
export class PrivacyRequestsService {
  private readonly adminApi = inject(AdminApiService);

  list(status?: PrivacyRequestStatus): Observable<Page<PrivacyRequest>> {
    return this.adminApi.listPrivacyRequests({ status });
  }
}
