import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AdminAuditDashboard,
  CatalogPricingDashboard,
  DashboardKey,
  DashboardQuery,
  FulfillmentPerformanceDashboard,
  InventoryMovementDashboard,
  NotificationDeliveryDashboard,
  OrderConversionFunnel,
  PromotionsEffectivenessDashboard,
  RevenueDashboard,
  ReviewsRatingsDashboard,
  UserGrowthDashboard,
} from '../model/models';

/**
 * Typed client for kart-analytics-service's internal query API (AUD-2).
 * Unlike every other generated client in this folder, this one does **not**
 * call `GATEWAY_BASE_PATH` — that contract's own `servers` note states
 * Analytics is "internal network segment only... never routed through the
 * public API Gateway," reached only via this app's own BFF acting as the
 * internal consumer (`requirement-spec.md` §3.5's "InternalBI consumer
 * path"). This service therefore calls the same-origin BFF proxy
 * (`/api/bff/analytics/dashboards/:name`, `server/bff/routes.ts`), which
 * holds the internal client-credentials service token server-side.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private readonly http = inject(HttpClient);

  private dashboard<T>(key: DashboardKey, query: DashboardQuery, extra: Record<string, string> = {}): Observable<T> {
    let params = new HttpParams().set('from', query.from).set('to', query.to);
    if (query.granularity) {
      params = params.set('granularity', query.granularity);
    }
    for (const [k, v] of Object.entries(extra)) {
      params = params.set(k, v);
    }
    return this.http.get<T>(`/api/bff/analytics/dashboards/${key}`, { params });
  }

  getOrderConversionFunnel(query: DashboardQuery): Observable<OrderConversionFunnel> {
    return this.dashboard('order-conversion-funnel', query);
  }

  getRevenueDashboard(query: DashboardQuery, filters: { sku?: string; category?: string } = {}): Observable<RevenueDashboard> {
    return this.dashboard('revenue', query, filters as Record<string, string>);
  }

  getFulfillmentPerformanceDashboard(query: DashboardQuery): Observable<FulfillmentPerformanceDashboard> {
    return this.dashboard('fulfillment-performance', query);
  }

  getInventoryMovementDashboard(query: DashboardQuery, filters: { sku?: string } = {}): Observable<InventoryMovementDashboard> {
    return this.dashboard('inventory-movement', query, filters as Record<string, string>);
  }

  getCatalogPricingDashboard(query: DashboardQuery): Observable<CatalogPricingDashboard> {
    return this.dashboard('catalog-pricing', query);
  }

  getPromotionsEffectivenessDashboard(query: DashboardQuery): Observable<PromotionsEffectivenessDashboard> {
    return this.dashboard('promotions-effectiveness', query);
  }

  getUserGrowthDashboard(query: DashboardQuery): Observable<UserGrowthDashboard> {
    return this.dashboard('user-growth', query);
  }

  getReviewsRatingsDashboard(query: DashboardQuery): Observable<ReviewsRatingsDashboard> {
    return this.dashboard('reviews-ratings', query);
  }

  getAdminAuditDashboard(query: DashboardQuery, filters: { actionType?: string } = {}): Observable<AdminAuditDashboard> {
    return this.dashboard('admin-audit', query, filters as Record<string, string>);
  }

  getNotificationDeliveryDashboard(query: DashboardQuery, filters: { channel?: string } = {}): Observable<NotificationDeliveryDashboard> {
    return this.dashboard('notification-delivery', query, filters as Record<string, string>);
  }
}
