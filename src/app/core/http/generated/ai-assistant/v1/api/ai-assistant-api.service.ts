import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import { AssistantQueryResult, SubmitQueryRequest } from '../model/models';

/**
 * Typed client for kart-ai-assistant-service's api-contract.yaml (one path).
 * No `Idempotency-Key` header — this service's single endpoint is read-only
 * end to end (api-contract.yaml's own header note: a retried/duplicated call
 * re-runs the same read and has no side effect beyond one more audit-log
 * row, the same reasoning kart-analytics-service's own contract already
 * uses for its GET endpoints).
 */
@Injectable({ providedIn: 'root' })
export class AiAssistantApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  submitQuery(request: SubmitQueryRequest): Observable<AssistantQueryResult> {
    return this.http.post<AssistantQueryResult>(`${this.basePath}/ai-assistant/query`, request);
  }
}
