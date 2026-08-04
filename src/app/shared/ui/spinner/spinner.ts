import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SpinnerSize = 'sm' | 'md';

@Component({
  selector: 'kart-spinner',
  templateUrl: './spinner.html',
  styleUrl: './spinner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', '[attr.aria-label]': 'label()' },
})
export class Spinner {
  readonly size = input<SpinnerSize>('md');
  readonly label = input('Loading');
}
