import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Modal } from './modal';

describe('Modal', () => {
  // Modal's Escape/Tab-trap listeners are bound to `document` for the
  // component's lifetime — destroy each fixture so a stale listener from
  // one test doesn't race the next (TestBed doesn't auto-destroy fixtures).
  let fixture: ReturnType<typeof TestBed.createComponent<Modal>>;

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders nothing when closed', () => {
    fixture = TestBed.createComponent(Modal);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('titleText', 'Title');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-modal')).toBeNull();
  });

  it('renders the dialog with its title when open', () => {
    fixture = TestBed.createComponent(Modal);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('titleText', 'Confirm');
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Confirm');
  });

  it('emits dismiss on backdrop click when dismissible', () => {
    fixture = TestBed.createComponent(Modal);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('titleText', 'Confirm');
    fixture.componentRef.setInput('dismissible', true);
    fixture.detectChanges();
    const emitted = spyOn(fixture.componentInstance.dismiss, 'emit');
    (fixture.nativeElement.querySelector('.kart-modal__backdrop-dismiss') as HTMLElement).click();
    expect(emitted).toHaveBeenCalled();
  });

  it('does not emit dismiss on backdrop click when not dismissible', () => {
    fixture = TestBed.createComponent(Modal);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('titleText', 'Confirm');
    fixture.componentRef.setInput('dismissible', false);
    fixture.detectChanges();
    const emitted = spyOn(fixture.componentInstance.dismiss, 'emit');
    (fixture.nativeElement.querySelector('.kart-modal__backdrop-dismiss') as HTMLElement).click();
    expect(emitted).not.toHaveBeenCalled();
  });

  describe('focus management (WCAG 2.2 AA)', () => {
    // Modal's Escape/Tab-trap listeners are bound to `document` for the
    // component's lifetime — destroy each fixture so a stale listener from
    // one test doesn't race the next (TestBed doesn't auto-destroy fixtures).
    let fixture: ReturnType<typeof TestBed.createComponent<Modal>>;

    afterEach(() => {
      fixture.destroy();
    });

    it('moves focus into the dialog container when there is no focusable content', async () => {
      fixture = TestBed.createComponent(Modal);
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('titleText', 'Confirm');
      fixture.detectChanges();
      await Promise.resolve(); // focusDialog() defers via queueMicrotask

      expect(document.activeElement?.getAttribute('role')).toBe('dialog');
    });

    it('restores focus to the previously-focused element on close', async () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();

      fixture = TestBed.createComponent(Modal);
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('titleText', 'Confirm');
      fixture.detectChanges();
      await Promise.resolve();

      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger);
      trigger.remove();
    });
  });

  describe('Tab trapping with projected content', () => {
    @Component({
      imports: [Modal],
      template: `
        <kart-modal [open]="isOpen()" titleText="Confirm">
          <button id="first">First</button>
          <div modalActions>
            <button id="last">Last</button>
          </div>
        </kart-modal>
      `,
    })
    class HostComponent {
      readonly isOpen = signal(true);
    }

    function tabEvent(shiftKey: boolean): KeyboardEvent {
      return new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });
    }

    // Calls the Modal child's own onTab() directly rather than dispatching a
    // real `document` keydown — the HostListener is bound to `document` for
    // the component's lifetime, and a global dispatch risks racing whichever
    // other Modal instance's own listener happens to still be attached
    // (fixture teardown ordering across nested describes is not something
    // this test should have to depend on to be deterministic).
    let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;
    let modal: Modal;

    beforeEach(() => {
      fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      modal = fixture.debugElement.children[0].componentInstance as Modal;
    });

    afterEach(() => {
      fixture.destroy();
    });

    it('wraps Tab from the last focusable element back to the first', () => {
      const last = fixture.nativeElement.querySelector('#last') as HTMLElement;
      last.focus();
      modal.onTab(tabEvent(false));

      expect(document.activeElement?.id).toBe('first');
    });

    it('wraps Shift+Tab from the first focusable element back to the last', () => {
      const first = fixture.nativeElement.querySelector('#first') as HTMLElement;
      first.focus();
      modal.onTab(tabEvent(true));

      expect(document.activeElement?.id).toBe('last');
    });

    it('does nothing when the modal is closed', () => {
      fixture.componentInstance.isOpen.set(false);
      fixture.detectChanges();
      const last = fixture.nativeElement.querySelector('#last');
      expect(last).toBeNull(); // content is gated behind @if (open())

      const event = tabEvent(false);
      const preventDefault = spyOn(event, 'preventDefault');
      modal.onTab(event);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });
});
