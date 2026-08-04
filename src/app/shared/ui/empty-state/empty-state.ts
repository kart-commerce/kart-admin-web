import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EmptyStateVariant = 'empty' | 'error' | 'access-denied';

/**
 * Shared empty-state illustration wrapper (design-system.md's Shared
 * Components row). Reused by every feature's empty/error list state, and by
 * the dedicated Access Denied route AUTH-5 introduces (edge-cases.md
 * "Direct-URL Navigation to a Category-Gated Route the Session's Grant
 * Doesn't Cover" — "reusing @kart/design-system's shared empty-state
 * illustration wrapper rather than a one-off implementation per feature").
 */
@Component({
  selector: 'kart-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly variant = input<EmptyStateVariant>('empty');
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
