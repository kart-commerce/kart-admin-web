import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AlertVariant = 'danger' | 'success' | 'info' | 'warning';

@Component({
  selector: 'kart-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'alert' },
})
export class Alert {
  readonly variant = input<AlertVariant>('info');
}
