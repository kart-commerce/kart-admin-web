import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AiAssistantApiService } from './ai-assistant-api.service';

/**
 * Hand-authored thin pass-through wrapper (core/http/generated/README.md's
 * provenance note) — worth asserting the URL/body directly rather than
 * trusting by convention alone, same posture AdminApiService's own spec
 * takes.
 */
describe('AiAssistantApiService', () => {
  let service: AiAssistantApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AiAssistantApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('submitQuery() POSTs to /ai-assistant/query with the request body', () => {
    service.submitQuery({ message: 'top 5 products' }).subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/ai-assistant/query');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ message: 'top 5 products' });
    req.flush({});
  });

  it('submitQuery() includes conversationId when supplied', () => {
    service.submitQuery({ conversationId: 'conv-1', message: 'only Electronics' }).subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/ai-assistant/query');
    expect(req.request.body).toEqual({ conversationId: 'conv-1', message: 'only Electronics' });
    req.flush({});
  });
});
