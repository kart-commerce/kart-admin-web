import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import { StockLevel } from '../model/models';

@Injectable({ providedIn: 'root' })
export class InventoryReadApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  getStockLevel(sku: string, warehouseId?: string): Observable<StockLevel> {
    let params = new HttpParams();
    if (warehouseId) {
      params = params.set('warehouseId', warehouseId);
    }
    return this.http.get<StockLevel>(`${this.basePath}/inventory/${encodeURIComponent(sku)}`, { params });
  }
}
