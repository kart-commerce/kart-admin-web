import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import { ProductResponse } from '../model/models';

@Injectable({ providedIn: 'root' })
export class ProductReadApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  getProduct(sku: string): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.basePath}/products/${encodeURIComponent(sku)}`);
  }
}
