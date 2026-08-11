import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import { Attribute } from '../model/models';

/**
 * Read-only typed client for kart-category-service's own `GET /attributes` - added for the
 * "Category & Attribute Management (Admin)" flow, mirroring CategoryReadApiService's own shape.
 */
@Injectable({ providedIn: 'root' })
export class AttributeReadApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  listAttributes(params: { categoryId?: string; includeDeprecated?: boolean } = {}): Observable<Attribute[]> {
    let httpParams = new HttpParams();
    if (params.categoryId !== undefined) {
      httpParams = httpParams.set('categoryId', params.categoryId);
    }
    if (params.includeDeprecated !== undefined) {
      httpParams = httpParams.set('includeDeprecated', String(params.includeDeprecated));
    }
    return this.http.get<Attribute[]>(`${this.basePath}/attributes`, { params: httpParams });
  }
}
