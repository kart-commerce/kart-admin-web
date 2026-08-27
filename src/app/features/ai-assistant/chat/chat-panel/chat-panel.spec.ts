import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { AssistantAnswerResponse, AssistantClarificationResponse, AssistantErrorResponse, AssistantQueryResult } from '../../../../core/http/generated/ai-assistant/v1';
import { AiAssistantSessionService } from '../data/ai-assistant-session.service';
import { ChatPanel } from './chat-panel';

describe('ChatPanel', () => {
  let session: jasmine.SpyObj<AiAssistantSessionService>;

  beforeEach(() => {
    session = jasmine.createSpyObj<AiAssistantSessionService>('AiAssistantSessionService', ['submitQuery']);
    TestBed.configureTestingModule({
      imports: [ChatPanel],
      providers: [{ provide: AiAssistantSessionService, useValue: session }],
    });
  });

  it('shows a hint when there are no messages yet', () => {
    session.submitQuery.and.returnValue(of());
    const fixture = TestBed.createComponent(ChatPanel);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ask a business question');
  });

  it('renders an answer with its table and disables the input while loading', () => {
    const subject = new Subject<AssistantQueryResult>();
    session.submitQuery.and.returnValue(subject);

    const fixture = TestBed.createComponent(ChatPanel);
    fixture.detectChanges();

    fixture.componentInstance.submit('top 5 products');
    fixture.detectChanges();
    expect(fixture.componentInstance['loading']()).toBeTrue();

    const response: AssistantAnswerResponse = {
      conversationId: 'conv-1',
      answer: 'Here are the top products.',
      data: { columns: ['product', 'revenue'], rows: [['Widget', 100]] },
      visualization: null,
      metadata: { source: 'kart-analytics-service', isProvisional: true, reconciledThrough: '2026-08-17', generatedAt: '2026-08-18T00:00:00Z' },
    };
    subject.next(response);
    subject.complete();
    fixture.detectChanges();

    expect(fixture.componentInstance['loading']()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Here are the top products.');
    expect(fixture.nativeElement.textContent).toContain('Widget');
    expect(fixture.nativeElement.textContent).toContain('Provisional');
  });

  it('renders clarification options and resubmits the chosen one', () => {
    const clarification: AssistantClarificationResponse = {
      conversationId: 'conv-1',
      clarification: { question: "By 'best,' do you mean revenue or units sold?", options: ['Revenue', 'Units Sold'] },
      data: null,
      visualization: null,
    };
    session.submitQuery.and.returnValue(of(clarification));

    const fixture = TestBed.createComponent(ChatPanel);
    fixture.detectChanges();
    fixture.componentInstance.submit('best products');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("By 'best,'");
    const optionButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLButtonElement).textContent?.includes('Revenue'),
    ) as HTMLButtonElement;
    expect(optionButton).toBeTruthy();

    optionButton.click();
    expect(session.submitQuery).toHaveBeenCalledWith('Revenue');
  });

  it('renders a friendly message for each error type', () => {
    const error: AssistantErrorResponse = {
      conversationId: null,
      error: { type: 'expired-session', message: 'expired' },
      data: null,
      visualization: null,
    };
    session.submitQuery.and.returnValue(of(error));

    const fixture = TestBed.createComponent(ChatPanel);
    fixture.detectChanges();
    fixture.componentInstance.submit('anything');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This conversation has expired');
  });

  it('falls back to a generic message for an unrecognized response shape', () => {
    session.submitQuery.and.returnValue(of({ somethingElse: true } as unknown as AssistantQueryResult));
    spyOn(console, 'error');

    const fixture = TestBed.createComponent(ChatPanel);
    fixture.detectChanges();
    fixture.componentInstance.submit('anything');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Couldn't process this response");
    expect(console.error).toHaveBeenCalled();
  });

  it('does not submit an empty or whitespace-only message', () => {
    session.submitQuery.and.returnValue(of());
    const fixture = TestBed.createComponent(ChatPanel);
    fixture.detectChanges();
    fixture.componentInstance.submit('   ');
    expect(session.submitQuery).not.toHaveBeenCalled();
  });

  it('unsubscribes any in-flight request on destroy', () => {
    const subject = new Subject<AssistantQueryResult>();
    session.submitQuery.and.returnValue(subject);
    const fixture = TestBed.createComponent(ChatPanel);
    fixture.detectChanges();
    fixture.componentInstance.submit('top products');

    fixture.destroy();
    expect(subject.observed).toBeFalse();
  });
});
