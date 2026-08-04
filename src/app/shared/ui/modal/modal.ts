import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal/dialog shell (design-system.md's Shared Components row —
 * "modal/dialog shell"). Used by the idle-timeout warning (AUTH-3),
 * absolute-session-cap warning (AUTH-4), and every feature's confirm-action
 * dialogs, so every modal in this app shares one focus/backdrop/escape
 * behavior instead of each screen improvising its own.
 *
 * WCAG 2.2 AA (requirement-spec.md §4) focus management, per the WAI-ARIA
 * Authoring Practices "Dialog (Modal)" pattern: moves focus into the dialog
 * on open, traps Tab/Shift+Tab within it while open, and restores focus to
 * whatever triggered the dialog on close — a background control never keeps
 * receiving keystrokes the visible dialog implies it owns.
 */
@Component({
  selector: 'kart-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly open = input.required<boolean>();
  readonly titleText = input.required<string>();
  /** Whether the backdrop/Escape can dismiss this modal — false for the absolute-cap warning, which has no "dismiss and keep working" action. */
  readonly dismissible = input(true);
  readonly dismiss = output<void>();

  @ViewChild('dialog') private readonly dialogRef?: ElementRef<HTMLElement>;

  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.previouslyFocused = document.activeElement as HTMLElement | null;
        this.focusDialog();
      } else if (this.previouslyFocused) {
        this.previouslyFocused.focus();
        this.previouslyFocused = null;
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open() && this.dismissible()) {
      this.dismiss.emit();
    }
  }

  @HostListener('document:keydown.tab', ['$event'])
  onTab(domEvent: Event): void {
    const event = domEvent as KeyboardEvent;
    if (!this.open()) {
      return;
    }
    const focusable = this.focusableElements();
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!focusable.includes(document.activeElement as HTMLElement)) {
      // Focus somehow escaped the dialog (e.g. a prior tab before this
      // listener attached) — pull it back in rather than letting Tab
      // continue into the page behind the backdrop.
      event.preventDefault();
      first.focus();
    }
  }

  onBackdropClick(): void {
    if (this.dismissible()) {
      this.dismiss.emit();
    }
  }

  private focusDialog(): void {
    // The `@if`-gated dialog element may not exist in the DOM yet on the
    // same tick the `open` signal flips — defer one microtask.
    queueMicrotask(() => {
      const focusable = this.focusableElements();
      (focusable[0] ?? this.dialogRef?.nativeElement)?.focus();
    });
  }

  private focusableElements(): HTMLElement[] {
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) {
      return [];
    }
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }
}
