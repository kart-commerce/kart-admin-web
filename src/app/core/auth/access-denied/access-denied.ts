import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyState } from '../../../shared/ui/empty-state/empty-state';

/**
 * Dedicated Access Denied route (AUTH-5, edge-cases.md "Direct-URL
 * Navigation to a Category-Gated Route the Session's Grant Doesn't Cover") —
 * every route guard in this app (`roleGuard`/`categoryGrantGuard`,
 * auth.guard.ts) redirects here on failure rather than a silent redirect to
 * the dashboard or a screen full of individually-failing API calls.
 */
@Component({
  selector: 'kart-access-denied',
  imports: [EmptyState, RouterLink],
  templateUrl: './access-denied.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDenied {}
