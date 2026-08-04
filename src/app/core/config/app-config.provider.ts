import { HttpClient } from '@angular/common/http';
import { EnvironmentProviders, inject, provideAppInitializer, Provider } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';

import { APP_CONFIG, AppConfig, DEFAULT_APP_CONFIG } from './app-config';

let resolvedConfig: AppConfig = DEFAULT_APP_CONFIG;

/**
 * Fetches runtime config from the BFF once at bootstrap (`GET
 * /api/bff/config`) and caches it in module state for `APP_CONFIG`'s
 * synchronous factory below. Falls back to `DEFAULT_APP_CONFIG` when the BFF
 * isn't reachable (e.g. `ng serve` without `npm run serve:bff` running) so
 * local development against the proxy still works.
 */
export function provideAppConfig(): (Provider | EnvironmentProviders)[] {
  return [
    provideAppInitializer(() => {
      const http = inject(HttpClient);
      return firstValueFrom(
        http.get<AppConfig>('/api/bff/config').pipe(catchError(() => of(DEFAULT_APP_CONFIG))),
      ).then((config) => {
        resolvedConfig = config;
      });
    }),
    {
      provide: APP_CONFIG,
      useFactory: () => resolvedConfig,
    },
  ];
}
