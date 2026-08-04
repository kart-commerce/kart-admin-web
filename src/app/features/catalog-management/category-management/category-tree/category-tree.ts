import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '../../../../shared/ui/button/button';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Modal } from '../../../../shared/ui/modal/modal';
import { RequiresGrant } from '../../../../core/auth/requires-grant.directive';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { Category } from '../../../../core/http/generated/category/v1';
import { CategoryForm } from '../category-form/category-form';
import { CategoryManagementService } from '../data/category-management.service';
import { CategoryTreeNode } from './category-tree-node.model';
import { CategoryTreeNodeItem } from './category-tree-node-item';

/** CAT-2: Category Management — taxonomy tree view, create/update/reorder/move. */
@Component({
  selector: 'kart-category-tree',
  imports: [DataTableShell, CategoryTreeNodeItem, CategoryForm, Modal, Button, KartInput, FormsModule, RequiresGrant],
  templateUrl: './category-tree.html',
  styleUrl: './category-tree.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTree implements OnInit {
  private readonly categoryManagementService = inject(CategoryManagementService);

  @ViewChild(CategoryForm) private readonly categoryForm!: CategoryForm;

  protected readonly nodes = signal<CategoryTreeNode[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly moveTarget = signal<CategoryTreeNode | null>(null);
  protected moveNewParentId = '';
  protected readonly moveSubmitting = signal(false);
  protected readonly moveError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadTopLevel();
  }

  private loadTopLevel(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.categoryManagementService.listChildren(null).subscribe({
      next: (categories) => {
        this.loading.set(false);
        this.nodes.set(categories.map((category) => this.toNode(category)));
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't load the category tree."));
      },
    });
  }

  private toNode(category: Category): CategoryTreeNode {
    return { category, children: null, expanded: false, loadingChildren: false };
  }

  toggle(target: CategoryTreeNode): void {
    if (target.expanded) {
      this.replaceNode(target.category.categoryId, { ...target, expanded: false });
      return;
    }

    if (target.children !== null) {
      this.replaceNode(target.category.categoryId, { ...target, expanded: true });
      return;
    }

    this.replaceNode(target.category.categoryId, { ...target, loadingChildren: true });
    this.categoryManagementService.listChildren(target.category.categoryId).subscribe({
      next: (categories) => {
        this.replaceNode(target.category.categoryId, {
          ...target,
          expanded: true,
          loadingChildren: false,
          children: categories.map((category) => this.toNode(category)),
        });
      },
      error: () => {
        this.replaceNode(target.category.categoryId, { ...target, loadingChildren: false, children: [] });
      },
    });
  }

  addRoot(): void {
    this.categoryForm.open({ mode: 'create', parentId: null });
  }

  addChild(target: CategoryTreeNode): void {
    this.categoryForm.open({ mode: 'create', parentId: target.category.categoryId });
  }

  edit(target: CategoryTreeNode): void {
    this.categoryForm.open({ mode: 'edit', parentId: target.category.parentId ?? null, category: target.category });
  }

  moveUp(target: CategoryTreeNode): void {
    this.swapWithSibling(target, -1);
  }

  moveDown(target: CategoryTreeNode): void {
    this.swapWithSibling(target, 1);
  }

  private swapWithSibling(target: CategoryTreeNode, direction: -1 | 1): void {
    const siblings = this.findSiblingArray(target.category.categoryId, this.nodes());
    if (!siblings) {
      return;
    }
    const index = siblings.findIndex((n) => n.category.categoryId === target.category.categoryId);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) {
      return;
    }

    const other = siblings[swapIndex];
    this.categoryManagementService.reorderCategory(target.category.categoryId, swapIndex).subscribe();
    this.categoryManagementService.reorderCategory(other.category.categoryId, index).subscribe({
      complete: () => this.loadTopLevel(),
    });
  }

  private findSiblingArray(categoryId: string, list: CategoryTreeNode[]): CategoryTreeNode[] | null {
    if (list.some((n) => n.category.categoryId === categoryId)) {
      return list;
    }
    for (const node of list) {
      if (node.children) {
        const found = this.findSiblingArray(categoryId, node.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  private replaceNode(categoryId: string, updated: CategoryTreeNode): void {
    const replaceIn = (list: CategoryTreeNode[]): CategoryTreeNode[] =>
      list.map((n) => {
        if (n.category.categoryId === categoryId) {
          return updated;
        }
        if (n.children) {
          return { ...n, children: replaceIn(n.children) };
        }
        return n;
      });
    this.nodes.set(replaceIn(this.nodes()));
  }

  openMove(target: CategoryTreeNode): void {
    this.moveTarget.set(target);
    this.moveNewParentId = '';
    this.moveError.set(null);
  }

  closeMove(): void {
    this.moveTarget.set(null);
  }

  submitMove(): void {
    const target = this.moveTarget();
    if (!target) {
      return;
    }
    this.moveSubmitting.set(true);
    this.moveError.set(null);
    this.categoryManagementService.moveCategory(target.category.categoryId, this.moveNewParentId || null).subscribe({
      next: () => {
        this.moveSubmitting.set(false);
        this.closeMove();
        this.loadTopLevel();
      },
      error: (error: unknown) => {
        this.moveSubmitting.set(false);
        this.moveError.set(extractErrorMessage(error, "Couldn't move this category. Try again."));
      },
    });
  }

  onSaved(): void {
    this.loadTopLevel();
  }
}
