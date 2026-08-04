import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import { Category } from '../model/models';

/**
 * Read-only typed client for kart-category-service's own `GET /categories`
 * (CAT-2's taxonomy tree view). See model/models.ts's header comment for
 * why writes are not exposed here.
 */
@Injectable({ providedIn: 'root' })
export class CategoryReadApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  listCategories(params: { parentId?: string; includeDeprecated?: boolean } = {}): Observable<Category[]> {
    let httpParams = new HttpParams();
    if (params.parentId !== undefined) {
      httpParams = httpParams.set('parentId', params.parentId);
    }
    if (params.includeDeprecated !== undefined) {
      httpParams = httpParams.set('includeDeprecated', String(params.includeDeprecated));
    }
    return this.http.get<Category[]>(`${this.basePath}/categories`, { params: httpParams });
  }
}
