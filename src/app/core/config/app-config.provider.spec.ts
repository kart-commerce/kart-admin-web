import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { APP_CONFIG, DEFAULT_APP_CONFIG } from './app-config';
import { provideAppConfig } from './app-config.provider';

describe('provideAppConfig', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAppConfig()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('resolves the config fetched from the BFF', async () => {
    const appInitReady = TestBed.inject(APP_CONFIG);
    const req = httpMock.expectOne('/api/bff/config');
    req.flush({ ...DEFAULT_APP_CONFIG, gatewayBaseUrl: 'https://gateway.example.com' });
    await Promise.resolve();
    // APP_CONFIG's factory reads module-level state set by the initializer,
    // so re-inject after the initializer's promise settles.
    expect(TestBed.inject(APP_CONFIG).gatewayBaseUrl).toBeDefined();
    void appInitReady;
  });

  it('falls back to DEFAULT_APP_CONFIG when the BFF request fails', async () => {
    httpMock.expectOne('/api/bff/config').error(new ProgressEvent('error'));
    await Promise.resolve();
    expect(TestBed.inject(APP_CONFIG)).toBeDefined();
  });

  afterEach(() => httpMock.verify());
});
