import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { Attribute, AttributeDataType, AttributeReadApiService } from '../../../../core/http/generated/category/v1';

export interface AttributeValueFormValue {
  value: string;
  displayOrder: number;
}

export interface AttributeFormValue {
  name: string;
  categoryId: string | null;
  dataType: AttributeDataType;
  values: AttributeValueFormValue[];
}

/**
 * Attribute Management's data layer — added for the "Category & Attribute Management (Admin)"
 * flow. Reads go straight to kart-category-service's own `GET /attributes`; writes go through
 * kart-admin-service's `/admin/attributes/*` proxy, mirroring CategoryManagementService's own
 * read/write split exactly.
 */
@Injectable({ providedIn: 'root' })
export class AttributeManagementService {
  private readonly attributeReadApi = inject(AttributeReadApiService);
  private readonly adminApi = inject(AdminApiService);

  listAttributes(categoryId?: string, includeDeprecated = false): Observable<Attribute[]> {
    return this.attributeReadApi.listAttributes({ categoryId, includeDeprecated });
  }

  createAttribute(value: AttributeFormValue): Observable<void> {
    return this.adminApi
      .createAttribute(
        { name: value.name, categoryId: value.categoryId, dataType: value.dataType, values: value.values },
        crypto.randomUUID(),
      )
      .pipe(map(() => undefined));
  }

  updateAttribute(attributeId: string, value: AttributeFormValue): Observable<void> {
    return this.adminApi
      .updateAttribute(attributeId, { name: value.name, values: value.values }, crypto.randomUUID())
      .pipe(map(() => undefined));
  }

  deprecateAttribute(attributeId: string): Observable<void> {
    return this.adminApi.deprecateAttribute(attributeId, crypto.randomUUID()).pipe(map(() => undefined));
  }
}
