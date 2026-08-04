import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import { SearchResponse, SearchSort } from '../model/models';

@Injectable({ providedIn: 'root' })
export class SearchApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  search(params: {
    q?: string;
    category?: string[];
    priceMin?: number;
    priceMax?: number;
    ratingMin?: number;
    sort?: SearchSort;
    page?: number;
    size?: number;
  } = {}): Observable<SearchResponse> {
    let httpParams = new HttpParams();
    if (params.q) {
      httpParams = httpParams.set('q', params.q);
    }
    for (const categoryId of params.category ?? []) {
      httpParams = httpParams.append('category', categoryId);
    }
    if (params.priceMin !== undefined) {
      httpParams = httpParams.set('priceMin', params.priceMin);
    }
    if (params.priceMax !== undefined) {
      httpParams = httpParams.set('priceMax', params.priceMax);
    }
    if (params.ratingMin !== undefined) {
      httpParams = httpParams.set('ratingMin', params.ratingMin);
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    httpParams = httpParams.set('page', params.page ?? 1).set('size', params.size ?? 20);

    return this.http.get<SearchResponse>(`${this.basePath}/search`, { params: httpParams });
  }
}
