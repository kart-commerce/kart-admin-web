import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import { UserProfileResponse } from '../model/models';

@Injectable({ providedIn: 'root' })
export class UserReadApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  getUserProfile(userId: string): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.basePath}/users/${encodeURIComponent(userId)}`);
  }
}
