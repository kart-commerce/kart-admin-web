import { Category } from '../../../../core/http/generated/category/v1';

export interface CategoryTreeNode {
  category: Category;
  /** `null` until this node's children have been fetched (lazy expansion — Category's read API has no bulk-tree endpoint). */
  children: CategoryTreeNode[] | null;
  expanded: boolean;
  loadingChildren: boolean;
}
