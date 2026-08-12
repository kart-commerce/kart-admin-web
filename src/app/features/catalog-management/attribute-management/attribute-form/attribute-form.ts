import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Modal } from '../../../../shared/ui/modal/modal';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { Attribute, AttributeDataType } from '../../../../core/http/generated/category/v1';
import { CategoryManagementService, CategoryOption } from '../../category-management/data/category-management.service';
import { AttributeManagementService } from '../data/attribute-management.service';

export interface AttributeFormContext {
  readonly mode: 'create' | 'edit';
  readonly attribute?: Attribute;
}

const DATA_TYPES: AttributeDataType[] = ['text', 'number', 'boolean', 'select'];

/**
 * Create/edit modal for the new Attribute aggregate, mirroring CategoryForm's own shape.
 * categoryId/dataType are immutable after creation (backend contract), so both are disabled in
 * edit mode rather than silently ignored on save.
 */
@Component({
  selector: 'kart-attribute-form',
  imports: [ReactiveFormsModule, Modal, FormField, KartInput, Button, Alert],
  templateUrl: './attribute-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeForm {
  private readonly fb = inject(FormBuilder);
  private readonly attributeManagementService = inject(AttributeManagementService);
  private readonly categoryManagementService = inject(CategoryManagementService);

  protected readonly context = signal<AttributeFormContext | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly categoryOptions = signal<CategoryOption[]>([]);
  protected readonly dataTypes = DATA_TYPES;

  readonly saved = output<void>();

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    categoryId: [''],
    dataType: this.fb.nonNullable.control<AttributeDataType>('text', [Validators.required]),
    values: this.fb.nonNullable.array<ReturnType<typeof this.buildValueGroup>>([]),
  });

  private buildValueGroup(value = '', displayOrder = 0) {
    return this.fb.nonNullable.group({
      value: [value, [Validators.required]],
      displayOrder: [displayOrder],
    });
  }

  get valuesArray() {
    return this.form.controls.values;
  }

  get isSelectType(): boolean {
    return this.form.controls.dataType.value === 'select';
  }

  addValue(): void {
    this.valuesArray.push(this.buildValueGroup('', this.valuesArray.length));
  }

  removeValue(index: number): void {
    this.valuesArray.removeAt(index);
  }

  open(context: AttributeFormContext): void {
    this.context.set(context);
    this.errorMessage.set(null);
    this.valuesArray.clear();

    const attribute = context.attribute;
    (attribute?.values ?? []).forEach((v) => this.valuesArray.push(this.buildValueGroup(v.value, v.displayOrder)));

    this.form.reset({
      name: attribute?.name ?? '',
      categoryId: attribute?.categoryId ?? '',
      dataType: attribute?.dataType ?? 'text',
    });

    if (context.mode === 'edit') {
      this.form.controls.categoryId.disable();
      this.form.controls.dataType.disable();
    } else {
      this.form.controls.categoryId.enable();
      this.form.controls.dataType.enable();
    }

    this.categoryManagementService.listAllActiveCategoriesFlattened().subscribe((options) => this.categoryOptions.set(options));
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
    const raw = this.form.getRawValue();
    const value = {
      name: raw.name,
      categoryId: raw.categoryId || null,
      dataType: raw.dataType,
      values: this.isSelectType ? raw.values : [],
    };

    const request$ =
      context.mode === 'create'
        ? this.attributeManagementService.createAttribute(value)
        : this.attributeManagementService.updateAttribute(context.attribute!.attributeId, value);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.close();
        this.saved.emit();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not save this attribute. Try again.'));
      },
    });
  }
}
