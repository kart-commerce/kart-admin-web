import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AiAssistantApiService, AssistantAnswerResponse, AssistantErrorResponse } from '../../../../core/http/generated/ai-assistant/v1';
import { AiAssistantSessionService } from './ai-assistant-session.service';

const STORAGE_KEY = 'kart-ai-assistant.conversationId';

describe('AiAssistantSessionService', () => {
  let api: jasmine.SpyObj<AiAssistantApiService>;

  beforeEach(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    api = jasmine.createSpyObj<AiAssistantApiService>('AiAssistantApiService', ['submitQuery']);
    TestBed.configureTestingModule({ providers: [{ provide: AiAssistantApiService, useValue: api }] });
  });

  afterEach(() => sessionStorage.removeItem(STORAGE_KEY));

  it('starts with no conversationId when sessionStorage is empty', () => {
    const service = TestBed.inject(AiAssistantSessionService);
    expect(service.conversationId()).toBeNull();
  });

  it('resumes a conversationId already in sessionStorage', () => {
    sessionStorage.setItem(STORAGE_KEY, 'conv-existing');
    const service = TestBed.inject(AiAssistantSessionService);
    expect(service.conversationId()).toBe('conv-existing');
  });

  it('submitQuery() sends the current conversationId and stores the one returned', () => {
    const response: AssistantAnswerResponse = {
      conversationId: 'conv-new',
      answer: 'Revenue is up.',
      data: { columns: ['metric'], rows: [['revenue']] },
      visualization: null,
      metadata: { source: 'kart-analytics-service', isProvisional: false, reconciledThrough: null, generatedAt: '2026-08-18T00:00:00Z' },
    };
    api.submitQuery.and.returnValue(of(response));

    const service = TestBed.inject(AiAssistantSessionService);
    service.submitQuery('top products').subscribe();

    expect(api.submitQuery).toHaveBeenCalledWith({ conversationId: undefined, message: 'top products' });
    expect(service.conversationId()).toBe('conv-new');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('conv-new');
  });

  it('clears the stored conversationId on an expired-session error', () => {
    sessionStorage.setItem(STORAGE_KEY, 'conv-stale');
    const response: AssistantErrorResponse = {
      conversationId: null,
      error: { type: 'expired-session', message: 'Session expired' },
      data: null,
      visualization: null,
    };
    api.submitQuery.and.returnValue(of(response));

    const service = TestBed.inject(AiAssistantSessionService);
    expect(service.conversationId()).toBe('conv-stale');

    service.submitQuery('follow up').subscribe();

    expect(service.conversationId()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
