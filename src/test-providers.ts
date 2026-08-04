import { EnvironmentProviders, provideZonelessChangeDetection } from '@angular/core';

/**
 * Global providers for every spec's TestBed (wired via angular.json's test
 * target `providersFile`) — mirrors app.config.ts's zoneless change
 * detection so `fixture.detectChanges()` behaves the same in tests as it
 * does in the real (zone.js-free) app.
 */
export default [provideZonelessChangeDetection()] satisfies EnvironmentProviders[];
