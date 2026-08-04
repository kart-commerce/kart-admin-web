/**
 * kart-user-service API — models (contracts/kart-user-service.api-contract.yaml).
 * This app only consumes `GET /v1/users/{userId}` (read) — SUP-2's
 * "customer account assistance" is a read-only profile/address lookup by
 * known userId (e.g. sourced from an order's own `userId`, ORD-1/SUP-1's
 * design source, since no user-search/directory endpoint exists anywhere in
 * this platform's approved contracts); every write endpoint on this
 * contract is scoped `clientCredentials: [self]` (profile-owner only), so
 * this app never calls them.
 */

export type AddressType = 'shipping' | 'billing';

export interface Address {
  addressId: string;
  type: AddressType;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
  isDefault: boolean;
}

export interface NotificationOptIn {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
}

export interface Preferences {
  locale?: string;
  currency?: string;
  notificationOptIn?: NotificationOptIn;
  marketingConsent?: boolean;
}

export interface UserProfileResponse {
  userId: string;
  email?: string;
  displayName?: string;
  addresses: Address[];
  preferences: Preferences;
  appInstalled?: boolean;
  lastUpdatedAt?: string;
}
