import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AnalyticsApiService } from '../../../../core/http/generated/analytics/v1';
import { AnalyticsDashboards } from './analytics-dashboards';

describe('AnalyticsDashboards', () => {
  let analyticsApi: jasmine.SpyObj<AnalyticsApiService>;

  beforeEach(() => {
    analyticsApi = jasmine.createSpyObj<AnalyticsApiService>('AnalyticsApiService', [
      'getOrderConversionFunnel',
      'getRevenueDashboard',
      'getFulfillmentPerformanceDashboard',
      'getInventoryMovementDashboard',
      'getCatalogPricingDashboard',
      'getPromotionsEffectivenessDashboard',
      'getUserGrowthDashboard',
      'getReviewsRatingsDashboard',
      'getAdminAuditDashboard',
      'getNotificationDeliveryDashboard',
    ]);
    TestBed.configureTestingModule({
      imports: [AnalyticsDashboards],
      providers: [provideRouter([]), { provide: AnalyticsApiService, useValue: analyticsApi }],
    });
  });

  it('loads the revenue dashboard by default', () => {
    analyticsApi.getRevenueDashboard.and.returnValue(
      of({ generatedAt: '2026-01-01T00:00:00Z', isProvisional: false, series: [{ bucketStart: '2026-01-01', revenue: { amount: 100, currency: 'USD' }, orderCount: 5 }] }),
    );
    const fixture = TestBed.createComponent(AnalyticsDashboards);
    fixture.detectChanges();
    fixture.componentInstance.load();
    fixture.detectChanges();

    expect(analyticsApi.getRevenueDashboard).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('100.00');
  });

  it('shows a provisional-data warning when isProvisional is true', () => {
    analyticsApi.getRevenueDashboard.and.returnValue(of({ generatedAt: '2026-01-01T00:00:00Z', isProvisional: true, series: [] }));
    const fixture = TestBed.createComponent(AnalyticsDashboards);
    fixture.detectChanges();
    fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('provisional');
  });

  it('shows an error state on failure', () => {
    analyticsApi.getRevenueDashboard.and.returnValue(throwError(() => ({ error: { message: 'Down' } })));
    const fixture = TestBed.createComponent(AnalyticsDashboards);
    fixture.detectChanges();
    fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Down');
  });

  it('loads a different dashboard when selected', () => {
    analyticsApi.getUserGrowthDashboard.and.returnValue(
      of({ generatedAt: '2026-01-01T00:00:00Z', isProvisional: false, signups: 10, sessionsCreated: 20, profileChanges: 3 }),
    );
    const fixture = TestBed.createComponent(AnalyticsDashboards);
    fixture.detectChanges();
    fixture.componentInstance['selectedDashboard'] = 'user-growth';
    fixture.componentInstance.load();
    fixture.detectChanges();

    expect(analyticsApi.getUserGrowthDashboard).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Signups: 10');
  });
});
