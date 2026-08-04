import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { Observable } from 'rxjs';

import { extractErrorMessage } from '../../../../core/auth/problem';
import { AnalyticsApiService, DashboardKey } from '../../../../core/http/generated/analytics/v1';

/**
 * Each dashboard case returns a differently-shaped response; the viewer
 * renders per-shape branches in the template (`@switch (selectedDashboard)`)
 * rather than a single statically-typed union, so the result is kept as
 * `any` here deliberately — the alternative (a `DashboardEnvelope &
 * Record<string, unknown>` intersection) trips
 * `noPropertyAccessFromIndexSignature` on every field access in the template.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDashboardResult = any;

const DASHBOARD_LABELS: Record<DashboardKey, string> = {
  'order-conversion-funnel': 'Order conversion funnel',
  revenue: 'Revenue',
  'fulfillment-performance': 'Fulfillment performance',
  'inventory-movement': 'Inventory movement',
  'catalog-pricing': 'Catalog & pricing changes',
  'promotions-effectiveness': 'Promotions effectiveness',
  'user-growth': 'User growth',
  'reviews-ratings': 'Reviews & ratings',
  'admin-audit': 'Admin audit volume',
  'notification-delivery': 'Notification delivery',
};

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * AUD-2: Analytics/Compliance Dashboards — sourced from
 * kart-analytics-service's internal query API, proxied through this app's
 * own BFF (see AnalyticsApiService's header comment for why: that service
 * is never reachable through the public gateway). Role-gated only (any
 * Admin), same as AUD-1.
 */
@Component({
  selector: 'kart-analytics-dashboards',
  imports: [FormsModule, RouterLink, RouterLinkActive, Button, KartInput, Spinner, Alert, Badge, DecimalPipe],
  templateUrl: './analytics-dashboards.html',
  styleUrl: './analytics-dashboards.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsDashboards {
  private readonly analyticsApi = inject(AnalyticsApiService);

  protected readonly dashboardKeys = Object.keys(DASHBOARD_LABELS) as DashboardKey[];
  protected readonly dashboardLabels = DASHBOARD_LABELS;

  protected selectedDashboard: DashboardKey = 'revenue';
  protected fromDate = defaultFromDate();
  protected toDate = todayDate();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<AnyDashboardResult | null>(null);

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.result.set(null);

    const query = { from: new Date(this.fromDate).toISOString(), to: new Date(this.toDate).toISOString() };
    const request$ = this.dashboardRequest(query);

    request$.subscribe({
      next: (result) => {
        this.loading.set(false);
        this.result.set(result);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't load this dashboard."));
      },
    });
  }

  private dashboardRequest(query: { from: string; to: string }): Observable<AnyDashboardResult> {
    switch (this.selectedDashboard) {
      case 'order-conversion-funnel':
        return this.analyticsApi.getOrderConversionFunnel(query);
      case 'revenue':
        return this.analyticsApi.getRevenueDashboard(query);
      case 'fulfillment-performance':
        return this.analyticsApi.getFulfillmentPerformanceDashboard(query);
      case 'inventory-movement':
        return this.analyticsApi.getInventoryMovementDashboard(query);
      case 'catalog-pricing':
        return this.analyticsApi.getCatalogPricingDashboard(query);
      case 'promotions-effectiveness':
        return this.analyticsApi.getPromotionsEffectivenessDashboard(query);
      case 'user-growth':
        return this.analyticsApi.getUserGrowthDashboard(query);
      case 'reviews-ratings':
        return this.analyticsApi.getReviewsRatingsDashboard(query);
      case 'admin-audit':
        return this.analyticsApi.getAdminAuditDashboard(query);
      case 'notification-delivery':
        return this.analyticsApi.getNotificationDeliveryDashboard(query);
    }
  }

  objectEntries(value: Record<string, number> | undefined): [string, number][] {
    return Object.entries(value ?? {});
  }
}
