import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Modal } from '../../../../shared/ui/modal/modal';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { Category } from '../../../../core/http/generated/category/v1';
import { CategoryManagementService } from '../data/category-management.service';

export interface CategoryFormContext {
  readonly mode: 'create' | 'edit';
  readonly parentId: string | null;
  readonly category?: Category;
}

/** CAT-2's create/edit modal, opened either standalone (create at root), "Add subcategory" (create with a fixed parent), or "Edit" (existing node). */
@Component({
  selector: 'kart-category-form',
  imports: [ReactiveFormsModule, Modal, FormField, KartInput, Button, Alert],
  templateUrl: './category-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryForm {
  private readonly fb = inject(FormBuilder);
  private readonly categoryManagementService = inject(CategoryManagementService);

  protected context = signal<CategoryFormContext | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  readonly saved = output<void>();

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
  });

  open(context: CategoryFormContext): void {
    this.context.set(context);
    this.errorMessage.set(null);
    this.form.reset({ name: context.category?.name ?? '' });
  }

  close(): void {
    this.context.set(null);
  }

  submit(): void {
    const context = this.context();
    if (!context || this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const name = this.form.getRawValue().name;

    const request$ =
      context.mode === 'create'
        ? this.categoryManagementService.createCategory({ name, parentId: context.parentId, displayOrder: 0 })
        : this.categoryManagementService.updateCategory(context.category!.categoryId, {
            name,
            parentId: context.category!.parentId ?? null,
            displayOrder: 0,
          });

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.close();
        this.saved.emit();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not save this category. Try again.'));
      },
    });
  }
}
