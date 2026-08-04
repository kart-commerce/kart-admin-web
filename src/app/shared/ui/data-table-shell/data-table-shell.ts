import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EmptyState } from '../empty-state/empty-state';
import { Spinner } from '../spinner/spinner';

/**
 * Shared list-screen chrome (design-system.md's "data-table primitives" —
 * every feature's list view projects its own `<table>` with its own
 * columns; this shell only owns the loading/empty/error states so every
 * screen renders them consistently instead of re-implementing the same
 * three branches per feature).
 */
@Component({
  selector: 'kart-data-table-shell',
  imports: [Spinner, EmptyState],
  templateUrl: './data-table-shell.html',
  styleUrl: './data-table-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableShell {
  readonly loading = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly empty = input(false);
  readonly emptyTitle = input('Nothing here yet');
  readonly emptyDescription = input<string | null>(null);
}
