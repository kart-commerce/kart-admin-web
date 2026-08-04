import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import {
  ApproveReturnRequestBody,
  Page,
  RejectReturnRequestBody,
  ReturnRequest,
  ReturnRequestStatus,
} from '../model/models';

/**
 * Typed client for the **assumed** ReturnRequest contract (SUP-3/SUP-4) —
 * see this folder's model/models.ts header and
 * `contracts/kart-order-service-returns.assumed.api-contract.yaml` for why
 * this isn't a real upstream contract yet. Routed through the gateway under
 * `/v1/returns/*` the same way every other generated client in this app is,
 * so swapping this for the real contract once it exists only means
 * replacing this folder, not this app's routing/auth model.
 */
@Injectable({ providedIn: 'root' })
export class ReturnRequestApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  list(params: { status?: ReturnRequestStatus; page?: number; pageSize?: number } = {}): Observable<Page<ReturnRequest>> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<Page<ReturnRequest>>(`${this.basePath}/returns`, { params: httpParams });
  }

  get(returnRequestId: string): Observable<ReturnRequest> {
    return this.http.get<ReturnRequest>(`${this.basePath}/returns/${encodeURIComponent(returnRequestId)}`);
  }

  approve(
    returnRequestId: string,
    body: ApproveReturnRequestBody,
    ifMatchVersion: number,
    idempotencyKey: string,
  ): Observable<ReturnRequest> {
    return this.http.post<ReturnRequest>(`${this.basePath}/returns/${encodeURIComponent(returnRequestId)}/approve`, body, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey, 'If-Match': String(ifMatchVersion) }),
    });
  }

  reject(
    returnRequestId: string,
    body: RejectReturnRequestBody,
    ifMatchVersion: number,
    idempotencyKey: string,
  ): Observable<ReturnRequest> {
    return this.http.post<ReturnRequest>(`${this.basePath}/returns/${encodeURIComponent(returnRequestId)}/reject`, body, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey, 'If-Match': String(ifMatchVersion) }),
    });
  }
}
