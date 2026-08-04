/**
 * kart-analytics-service Internal Query API — models
 * (docs/services/kart-analytics-service/api-contract.yaml). See
 * `api/analytics-api.service.ts`'s header comment for why this client calls
 * a same-origin BFF proxy rather than `GATEWAY_BASE_PATH` like every other
 * generated client in this folder.
 */

export interface Money {
  amount: number;
  currency: string;
}

export interface DurationPercentiles {
  p50Hours?: number;
  p95Hours?: number;
  p99Hours?: number;
}

export interface DashboardEnvelope {
  generatedAt: string;
  isProvisional: boolean;
  reconciledThrough?: string | null;
}

export type Granularity = 'hour' | 'day' | 'week' | 'month';

export interface DashboardQuery {
  from: string;
  to: string;
  granularity?: Granularity;
}

export interface OrderConversionFunnel extends DashboardEnvelope {
  stages: { stage: string; count: number; dropOffRate: number | null }[];
}

export interface RevenueDashboard extends DashboardEnvelope {
  series: { bucketStart: string; revenue: Money; orderCount: number }[];
}

export interface FulfillmentPerformanceDashboard extends DashboardEnvelope {
  timeToShip: DurationPercentiles;
  timeToDeliver: DurationPercentiles;
}

export interface InventoryMovementDashboard extends DashboardEnvelope {
  reserved: number;
  reservationFailed: number;
  released: number;
  replenished: number;
}

export interface CatalogPricingDashboard extends DashboardEnvelope {
  productsCreated: number;
  priceChanges: number;
  categoryUpdates: number;
}

export interface PromotionsEffectivenessDashboard extends DashboardEnvelope {
  couponsRedeemed: number;
  quotesIssued: number;
  attributableOrderVolume: Money;
  redemptionRate: number;
}

export interface UserGrowthDashboard extends DashboardEnvelope {
  signups: number;
  sessionsCreated: number;
  profileChanges: number;
}

export interface ReviewsRatingsDashboard extends DashboardEnvelope {
  reviewCount: number;
  ratingDistribution: Record<string, number>;
}

export interface AdminAuditDashboard extends DashboardEnvelope {
  actions: { occurredAt: string; actionType: string; adminId: string }[];
}

export interface NotificationDeliveryDashboard extends DashboardEnvelope {
  byChannel: { channel: string; sent: number; priceAlertsTriggered: number }[];
}

export type DashboardKey =
  | 'order-conversion-funnel'
  | 'revenue'
  | 'fulfillment-performance'
  | 'inventory-movement'
  | 'catalog-pricing'
  | 'promotions-effectiveness'
  | 'user-growth'
  | 'reviews-ratings'
  | 'admin-audit'
  | 'notification-delivery';
