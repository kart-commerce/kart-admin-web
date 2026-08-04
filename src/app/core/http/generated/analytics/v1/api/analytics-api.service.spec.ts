import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AnalyticsApiService } from './analytics-api.service';

describe('AnalyticsApiService', () => {
  let service: AnalyticsApiService;
  let httpMock: HttpTestingController;
  const query = { from: '2026-01-01', to: '2026-02-01' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AnalyticsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('every dashboard getter calls the same-origin BFF proxy, never GATEWAY_BASE_PATH', () => {
    service.getRevenueDashboard(query).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/analytics/dashboards/revenue');
    expect(req.request.url.startsWith('/v1')).toBeFalse();
    req.flush({ generatedAt: 'now', isProvisional: false, series: [] });
  });

  it('getOrderConversionFunnel() targets the order-conversion-funnel dashboard key', () => {
    service.getOrderConversionFunnel(query).subscribe();
    httpMock
      .expectOne((r) => r.url === '/api/bff/analytics/dashboards/order-conversion-funnel')
      .flush({ generatedAt: 'now', isProvisional: false, stages: [] });
  });

  it('getRevenueDashboard() forwards sku/category filters as query params', () => {
    service.getRevenueDashboard(query, { sku: 'SKU-1', category: 'electronics' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/analytics/dashboards/revenue');
    expect(req.request.params.get('sku')).toBe('SKU-1');
    expect(req.request.params.get('category')).toBe('electronics');
    req.flush({ generatedAt: 'now', isProvisional: false, series: [] });
  });

  it('getFulfillmentPerformanceDashboard() targets fulfillment-performance', () => {
    service.getFulfillmentPerformanceDashboard(query).subscribe();
    httpMock
      .expectOne((r) => r.url === '/api/bff/analytics/dashboards/fulfillment-performance')
      .flush({ generatedAt: 'now', isProvisional: false });
  });

  it('getInventoryMovementDashboard() forwards an optional sku filter', () => {
    service.getInventoryMovementDashboard(query, { sku: 'SKU-1' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/analytics/dashboards/inventory-movement');
    expect(req.request.params.get('sku')).toBe('SKU-1');
    req.flush({ generatedAt: 'now', isProvisional: false });
  });

  it('getCatalogPricingDashboard() targets catalog-pricing', () => {
    service.getCatalogPricingDashboard(query).subscribe();
    httpMock.expectOne((r) => r.url === '/api/bff/analytics/dashboards/catalog-pricing').flush({ generatedAt: 'now', isProvisional: false });
  });

  it('getPromotionsEffectivenessDashboard() targets promotions-effectiveness', () => {
    service.getPromotionsEffectivenessDashboard(query).subscribe();
    httpMock
      .expectOne((r) => r.url === '/api/bff/analytics/dashboards/promotions-effectiveness')
      .flush({ generatedAt: 'now', isProvisional: false });
  });

  it('getUserGrowthDashboard() targets user-growth', () => {
    service.getUserGrowthDashboard(query).subscribe();
    httpMock.expectOne((r) => r.url === '/api/bff/analytics/dashboards/user-growth').flush({ generatedAt: 'now', isProvisional: false });
  });

  it('getReviewsRatingsDashboard() targets reviews-ratings', () => {
    service.getReviewsRatingsDashboard(query).subscribe();
    httpMock.expectOne((r) => r.url === '/api/bff/analytics/dashboards/reviews-ratings').flush({ generatedAt: 'now', isProvisional: false });
  });

  it('getAdminAuditDashboard() forwards an optional actionType filter', () => {
    service.getAdminAuditDashboard(query, { actionType: 'product.create' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/analytics/dashboards/admin-audit');
    expect(req.request.params.get('actionType')).toBe('product.create');
    req.flush({ generatedAt: 'now', isProvisional: false });
  });

  it('getNotificationDeliveryDashboard() forwards an optional channel filter', () => {
    service.getNotificationDeliveryDashboard(query, { channel: 'email' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/analytics/dashboards/notification-delivery');
    expect(req.request.params.get('channel')).toBe('email');
    req.flush({ generatedAt: 'now', isProvisional: false });
  });

  it('omits granularity from the query params when not provided', () => {
    service.getRevenueDashboard(query).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/analytics/dashboards/revenue');
    expect(req.request.params.has('granularity')).toBeFalse();
    req.flush({ generatedAt: 'now', isProvisional: false, series: [] });
  });
});
