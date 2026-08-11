import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, from, map } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { Category, CategoryReadApiService } from '../../../../core/http/generated/category/v1';

export interface CategoryFormValue {
  name: string;
  parentId: string | null;
  displayOrder: number;
}

/** A flattened taxonomy entry for a `<select>`-style category picker (product form's `categoryId`, attribute form's category scope). */
export interface CategoryOption {
  categoryId: string;
  label: string;
  depth: number;
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

  /**
   * Walks the whole active taxonomy (root-first, depth-first) into one flat, indented list -
   * `GET /categories` has no bulk-tree endpoint (CategoryTree itself only ever fetches one level
   * lazily), so a real category picker (product form's `categoryId`, attribute form's category
   * scope) needs this eager walk instead. Fine for this platform's max depth of 4 and admin-only
   * traffic; would need a real bulk endpoint if the taxonomy ever grew large enough for this to
   * matter.
   */
  listAllActiveCategoriesFlattened(): Observable<CategoryOption[]> {
    return from(this.walk(null, 0));
  }

  private async walk(parentId: string | null, depth: number): Promise<CategoryOption[]> {
    const children = await firstValueFrom(this.listChildren(parentId));
    const options: CategoryOption[] = [];
    for (const child of children) {
      options.push({ categoryId: child.categoryId, label: `${'—'.repeat(depth)} ${child.name}`.trim(), depth });
      options.push(...(await this.walk(child.categoryId, depth + 1)));
    }
    return options;
  }
}
