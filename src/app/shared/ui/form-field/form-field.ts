import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Thin label/error/hint wrapper around a projected native `<input>`. The
 * consumer is responsible for setting `[id]="inputId"` on the projected
 * input themselves (rather than this component generating one) — a
 * generated id would be a needless indirection for a CSR-only app with no
 * hydration-mismatch concern to avoid in the first place.
 */
@Component({
  selector: 'kart-form-field',
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormField {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
}
