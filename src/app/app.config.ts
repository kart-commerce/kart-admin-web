import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { mutatingRequestInterceptor } from './core/auth/mutating-request.interceptor';
import { provideAppConfig } from './core/config/app-config.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([mutatingRequestInterceptor, authInterceptor])),
    // core/http/generated/**'s GATEWAY_BASE_PATH already defaults to
    // same-origin '/api/bff/gateway/v1' (base-path.ts), the BFF's
    // token-relay proxy — this app is CSR-only, so unlike kart-web there's
    // no server/browser branching to provide here.
    ...provideAppConfig(),
  ],
};
