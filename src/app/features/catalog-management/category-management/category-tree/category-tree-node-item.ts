import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';

import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { RequiresGrant } from '../../../../core/auth/requires-grant.directive';
import { CategoryTreeNode } from './category-tree-node.model';

/**
 * Recursive row renderer for CategoryTree — one node, plus its (lazily
 * loaded) children. Every action output carries the specific
 * `CategoryTreeNode` it applies to, and each recursion level relays its
 * children's emissions verbatim (`(edit)="edit.emit($event)"`), so a click
 * anywhere in the tree, at any depth, reaches CategoryTree's own handlers
 * with the exact node it happened on — no per-level wrapping needed.
 */
@Component({
  selector: 'kart-category-tree-node-item',
  imports: [Badge, Button, Spinner, RequiresGrant, CategoryTreeNodeItem],
  templateUrl: './category-tree-node-item.html',
  styleUrl: './category-tree-node-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTreeNodeItem {
  readonly node = input.required<CategoryTreeNode>();
  readonly isFirst = input(false);
  readonly isLast = input(false);

  @Output() readonly toggleExpand = new EventEmitter<CategoryTreeNode>();
  @Output() readonly edit = new EventEmitter<CategoryTreeNode>();
  @Output() readonly addChild = new EventEmitter<CategoryTreeNode>();
  @Output() readonly moveUp = new EventEmitter<CategoryTreeNode>();
  @Output() readonly moveDown = new EventEmitter<CategoryTreeNode>();
  @Output() readonly move = new EventEmitter<CategoryTreeNode>();
}
