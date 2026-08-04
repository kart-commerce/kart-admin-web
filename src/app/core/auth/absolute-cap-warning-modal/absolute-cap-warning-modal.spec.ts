import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AbsoluteCapWarningService } from '../absolute-cap-warning.service';
import { AbsoluteCapWarningModal } from './absolute-cap-warning-modal';

describe('AbsoluteCapWarningModal', () => {
  it('shows the no-extension warning and acknowledges it', () => {
    const capWarning = { warningVisible: signal(true), acknowledge: jasmine.createSpy('acknowledge') };
    TestBed.configureTestingModule({
      imports: [AbsoluteCapWarningModal],
      providers: [{ provide: AbsoluteCapWarningService, useValue: capWarning }],
    });
    const fixture = TestBed.createComponent(AbsoluteCapWarningModal);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('cannot be extended');
    (fixture.nativeElement.querySelector('.kart-modal__actions button') as HTMLButtonElement).click();
    expect(capWarning.acknowledge).toHaveBeenCalled();
  });
});
