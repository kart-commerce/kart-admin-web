import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { DraftStoreService } from '../../../../core/auth/draft-store.service';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { GRANT_CATEGORIES, GrantCategory, PermissionGrant } from '../../../../core/http/generated/admin/v1';
import { PermissionGrantManagementService } from '../data/permission-grant-management.service';

const DRAFT_KEY = 'permission-grant-issue-form';

/**
 * IDN-2: Permission Grant Management — issue/revoke a category-scoped
 * grant, view the grant list. The category dropdown reads its options from
 * `GRANT_CATEGORIES` (core/http/generated/admin/v1) — never hand-enumerated
 * here — so the `compliance` value (XTEAM-1) flows through automatically
 * once that file is regenerated against the real contract.
 *
 * Wires AUTH-4's `DraftStoreService`: the issue-grant form is exactly the
 * kind of "genuinely multi-step Admin form" design-decisions.md's absolute-
 * session-cap decision names — its `principalId`/`category` fields are
 * autosaved as the Admin types and restored if the absolute-cap warning (or
 * simply closing the tab) interrupts them mid-entry.
 */
@Component({
  selector: 'kart-permission-grant-management',
  imports: [ReactiveFormsModule, DataTableShell, Card, FormField, KartInput, Button, Alert, Badge, DatePipe],
  templateUrl: './permission-grant-management.html',
  styleUrl: './permission-grant-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionGrantManagement implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PermissionGrantManagementService);
  private readonly draftStore = inject(DraftStoreService);

  protected readonly categories = GRANT_CATEGORIES;

  protected readonly grants = signal<PermissionGrant[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly revokingGrantId = signal<string | null>(null);

  protected readonly issueForm = this.fb.nonNullable.group({
    principalId: ['', [Validators.required]],
    category: ['catalog-management' as GrantCategory, [Validators.required]],
  });
  protected readonly issuing = signal(false);
  protected readonly issueError = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
    const draft = this.draftStore.load<{ principalId: string; category: GrantCategory }>(DRAFT_KEY);
    if (draft) {
      this.issueForm.patchValue(draft);
    }
    this.issueForm.valueChanges.subscribe((value) => {
      this.draftStore.save(DRAFT_KEY, value);
    });
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.list({ includeRevoked: false }).subscribe({
      next: (page) => {
        this.loading.set(false);
        this.grants.set(page.items);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't load permission grants."));
      },
    });
  }

  issue(): void {
    if (this.issueForm.invalid || this.issuing()) {
      this.issueForm.markAllAsTouched();
      return;
    }

    this.issuing.set(true);
    this.issueError.set(null);
    this.service.issue(this.issueForm.getRawValue()).subscribe({
      next: () => {
        this.issuing.set(false);
        this.issueForm.reset({ principalId: '', category: 'catalog-management' });
        this.draftStore.clear(DRAFT_KEY);
        this.load();
      },
      error: (error: unknown) => {
        this.issuing.set(false);
        this.issueError.set(extractErrorMessage(error, 'Could not issue this grant — it may already exist.'));
      },
    });
  }

  revoke(grant: PermissionGrant): void {
    if (!confirm(`Revoke ${grant.category} for ${grant.principalId}?`)) {
      return;
    }
    this.revokingGrantId.set(grant.grantId);
    this.errorMessage.set(null);
    this.service.revoke(grant.grantId, grant.version).subscribe({
      next: () => {
        this.revokingGrantId.set(null);
        this.load();
      },
      error: (error: unknown) => {
        this.revokingGrantId.set(null);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't revoke this grant — it may have already changed. Reloading."));
        this.load();
      },
    });
  }
}
