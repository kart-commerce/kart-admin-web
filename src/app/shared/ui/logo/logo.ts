import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LogoVariant = 'full' | 'mark';

/** Brand mark (public/logo.svg, shared with kart-web per design-system.md — one brand, one design language). */
@Component({
  selector: 'kart-logo',
  templateUrl: './logo.html',
  styleUrl: './logo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  readonly variant = input<LogoVariant>('full');
}
