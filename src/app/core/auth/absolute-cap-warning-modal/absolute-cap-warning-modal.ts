import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Button } from '../../../shared/ui/button/button';
import { Modal } from '../../../shared/ui/modal/modal';
import { AbsoluteCapWarningService } from '../absolute-cap-warning.service';

/**
 * AUTH-4's advance warning ahead of the hard, non-sliding absolute session
 * cap — deliberately distinct copy/behavior from the idle-timeout warning
 * (`IdleWarningModal`): there is no "Stay signed in" action here, since the
 * cap cannot be extended (design-decisions.md "Absolute-Session-Cap Advance
 * Warning + Client-Side Draft Persistence").
 */
@Component({
  selector: 'kart-absolute-cap-warning-modal',
  imports: [Modal, Button],
  templateUrl: './absolute-cap-warning-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbsoluteCapWarningModal {
  protected readonly capWarning = inject(AbsoluteCapWarningService);
}
