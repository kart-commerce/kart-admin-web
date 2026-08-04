import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Button } from '../../../shared/ui/button/button';
import { Modal } from '../../../shared/ui/modal/modal';
import { IdleSessionService } from '../idle-session.service';

/**
 * security.md §2.2's 60-second idle-timeout warning modal — a live
 * countdown with a single "Stay signed in" action. Rendered once, app-wide
 * (App component template), reflecting `IdleSessionService.state()`.
 */
@Component({
  selector: 'kart-idle-warning-modal',
  imports: [Modal, Button],
  templateUrl: './idle-warning-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdleWarningModal {
  protected readonly idleSession = inject(IdleSessionService);
  protected readonly isOpen = computed(() => this.idleSession.state() === 'warning');

  stayLoggedIn(): void {
    this.idleSession.extendSession();
  }
}
