import { Directive } from '@angular/core';

/**
 * Token-based styling for native `<input>`/`<select>`/`<textarea>` elements
 * used with Reactive Forms directly (`[formControl]`/`formControlName`) — a
 * thin attribute directive rather than a ControlValueAccessor wrapper
 * component, since a native input is already a fully-compliant form control.
 */
@Directive({
  selector: 'input[kartInput], select[kartInput], textarea[kartInput]',
  host: { class: 'kart-input' },
})
export class KartInput {}
