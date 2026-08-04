import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { Category, CategoryReadApiService } from '../../../../core/http/generated/category/v1';

export interface CategoryFormValue {
  name: string;
  parentId: string | null;
  displayOrder: number;
}

/**
 * CAT-2's data layer — reads go straight to kart-category-service's own
 * `GET /categories` (per-parent, since it has no bulk-tree endpoint —
 * `CategoryTree` builds the tree lazily, level by level); writes go through
 * kart-admin-service's `/admin/categories/*` proxy (CAT-2's design source).
 */
@Injectable({ providedIn: 'root' })
export class CategoryManagementService {
  private readonly categoryReadApi = inject(CategoryReadApiService);
  private readonly adminApi = inject(AdminApiService);

  listChildren(parentId: string | null, includeDeprecated = false): Observable<Category[]> {
    return this.categoryReadApi.listCategories({ parentId: parentId ?? undefined, includeDeprecated });
  }

  createCategory(value: CategoryFormValue): Observable<void> {
    return this.adminApi
      .createCategory(
        { name: value.name, parentId: value.parentId, displayOrder: value.displayOrder },
        crypto.randomUUID(),
      )
      .pipe(map(() => undefined));
  }

  /**
   * Category's read model (`Category`) exposes no version/ETag field this
   * app can carry forward for kart-admin-service's required `If-Match`
   * precondition on `PUT /admin/categories/{id}` — a gap between that
   * read shape and this write endpoint's own contract. Rather than fabricate
   * a version value with no real backing, this sends the RFC 7232 §3.1
   * wildcard (`If-Match: *`, "match whatever the current state is"), which
   * forgoes this screen's own optimistic-concurrency UX until the read
   * model exposes a real version field — a documented trade-off, not an
   * oversight.
   */
  updateCategory(categoryId: string, value: CategoryFormValue): Observable<void> {
    return this.adminApi
      .updateCategory(
        categoryId,
        { name: value.name, parentId: value.parentId, displayOrder: value.displayOrder },
        '*',
        crypto.randomUUID(),
      )
      .pipe(map(() => undefined));
  }

  /**
   * `displayOrder` here is the target's position among its currently-displayed
   * siblings (0-based) — another read/write gap: `Category` exposes no
   * `displayOrder` field for this app to read back and increment/decrement
   * precisely, so `CategoryTree`'s up/down actions pass the sibling array's
   * own index as a documented proxy rather than a fabricated precise value.
   */
  reorderCategory(categoryId: string, displayOrder: number): Observable<void> {
    return this.adminApi.reorderCategory(categoryId, displayOrder, crypto.randomUUID()).pipe(map(() => undefined));
  }

  moveCategory(categoryId: string, newParentId: string | null): Observable<void> {
    return this.adminApi.moveCategory(categoryId, newParentId, crypto.randomUUID()).pipe(map(() => undefined));
  }
}
