import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';

import { Button } from '../../../../shared/ui/button/button';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { RequiresGrant } from '../../../../core/auth/requires-grant.directive';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { Attribute } from '../../../../core/http/generated/category/v1';
import { AttributeForm } from '../attribute-form/attribute-form';
import { AttributeManagementService } from '../data/attribute-management.service';

/** Attribute Management — list, create, update, deprecate an attribute. Added for the "Category & Attribute Management (Admin)" flow, mirroring ProductList's own shape. */
@Component({
  selector: 'kart-attribute-list',
  imports: [DataTableShell, Button, RequiresGrant, AttributeForm],
  templateUrl: './attribute-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeList implements OnInit {
  private readonly attributeManagementService = inject(AttributeManagementService);

  @ViewChild(AttributeForm) private readonly attributeForm!: AttributeForm;

  protected readonly results = signal<Attribute[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deprecatingId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.attributeManagementService.listAttributes().subscribe({
      next: (attributes) => {
        this.loading.set(false);
        this.results.set(attributes);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't load attributes."));
      },
    });
  }

  create(): void {
    this.attributeForm.open({ mode: 'create' });
  }

  edit(attribute: Attribute): void {
    this.attributeForm.open({ mode: 'edit', attribute });
  }

  onSaved(): void {
    // Unlike Product's search-index staleness, Attribute reads straight from Category Service's
    // own PostgreSQL - a plain reload here reflects the write immediately, no local patching
    // needed.
    this.load();
  }

  deprecate(attribute: Attribute): void {
    if (!confirm(`Deprecate "${attribute.name}"? Products already using it keep their value.`)) {
      return;
    }
    this.deprecatingId.set(attribute.attributeId);
    this.attributeManagementService.deprecateAttribute(attribute.attributeId).subscribe({
      next: () => {
        this.deprecatingId.set(null);
        this.load();
      },
      error: (error: unknown) => {
        this.deprecatingId.set(null);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't deprecate this attribute."));
      },
    });
  }
}
