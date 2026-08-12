import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AdminApiService } from './admin-api.service';

/**
 * These thin pass-through wrappers are hand-authored (see
 * core/http/generated/README.md's provenance note), not machine-generated —
 * unlike a real openapi-generator output, a wrong URL/param/header here is
 * a real bug this app already found once (see git history on this file).
 * Worth asserting directly rather than trusting by convention alone.
 */
describe('AdminApiService', () => {
  let service: AdminApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listPermissionGrants() GETs /admin/permission-grants with query params', () => {
    service.listPermissionGrants({ principalId: 'p1', category: 'catalog-management' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/gateway/v1/admin/permission-grants');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('principalId')).toBe('p1');
    req.flush({ items: [], page: 1, pageSize: 50, total: 0 });
  });

  it('issuePermissionGrant() POSTs with an Idempotency-Key header', () => {
    service.issuePermissionGrant({ principalId: 'p1', category: 'catalog-management' }, 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/admin/permission-grants');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-1');
    expect(req.request.body).toEqual({ principalId: 'p1', category: 'catalog-management' });
    req.flush({});
  });

  it('revokePermissionGrant() POSTs to /revoke with If-Match set to the current version', () => {
    service.revokePermissionGrant('grant-1', 3, 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/admin/permission-grants/grant-1/revoke');
    expect(req.request.headers.get('If-Match')).toBe('3');
    req.flush({});
  });

  it('createProduct() POSTs to /admin/products', () => {
    service.createProduct({ name: 'Widget', categoryId: 'cat-1', price: { amount: 1, currency: 'USD' } }, 'idem-1').subscribe();
    httpMock.expectOne('/api/bff/gateway/v1/admin/products').flush({});
  });

  it('updateProduct() PUTs with If-Match set to the given precondition', () => {
    service.updateProduct('SKU-1', { name: 'Widget', categoryId: 'cat-1', price: { amount: 1, currency: 'USD' } }, '2026-01-01', 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/admin/products/SKU-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('If-Match')).toBe('2026-01-01');
    req.flush({});
  });

  it('deactivateProduct() POSTs to /deactivate', () => {
    service.deactivateProduct('SKU-1', 'idem-1').subscribe();
    httpMock.expectOne('/api/bff/gateway/v1/admin/products/SKU-1/deactivate').flush({});
  });

  it('createCategory() POSTs to /admin/categories', () => {
    service.createCategory({ name: 'Electronics' }, 'idem-1').subscribe();
    httpMock.expectOne('/api/bff/gateway/v1/admin/categories').flush({});
  });

  it('updateCategory() PUTs with the RFC 7232 wildcard If-Match when given "*"', () => {
    service.updateCategory('cat-1', { name: 'Electronics' }, '*', 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/admin/categories/cat-1');
    expect(req.request.headers.get('If-Match')).toBe('*');
    req.flush({});
  });

  it('reorderCategory() POSTs the target displayOrder', () => {
    service.reorderCategory('cat-1', 2, 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/admin/categories/cat-1/reorder');
    expect(req.request.body).toEqual({ displayOrder: 2 });
    req.flush({});
  });

  it('moveCategory() POSTs the newParentId (nullable)', () => {
    service.moveCategory('cat-1', null, 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/admin/categories/cat-1/move');
    expect(req.request.body).toEqual({ newParentId: null });
    req.flush({});
  });

  it('createAttribute() POSTs to /admin/attributes', () => {
    service.createAttribute({ name: 'Color', categoryId: null, dataType: 'select', values: [{ value: 'Red', displayOrder: 0 }] }, 'idem-1').subscribe();
    httpMock.expectOne('/api/bff/gateway/v1/admin/attributes').flush({});
  });

  it('updateAttribute() PUTs to /admin/attributes/{id}', () => {
    service.updateAttribute('attr-1', { name: 'Primary Color', values: [] }, 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/admin/attributes/attr-1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('deprecateAttribute() DELETEs /admin/attributes/{id}', () => {
    service.deprecateAttribute('attr-1', 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/admin/attributes/attr-1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('createCoupon() POSTs to /admin/coupons', () => {
    service.createCoupon({ couponCode: 'SAVE10', discountValue: { amount: 10, currency: 'USD' } }, 'idem-1').subscribe();
    httpMock.expectOne('/api/bff/gateway/v1/admin/coupons').flush({});
  });

  it('deactivateCoupon() POSTs to /deactivate by couponCode', () => {
    service.deactivateCoupon('SAVE10', 'idem-1').subscribe();
    httpMock.expectOne('/api/bff/gateway/v1/admin/coupons/SAVE10/deactivate').flush({});
  });

  it('listCoupons() GETs /admin/coupons', () => {
    service.listCoupons({ page: 2 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/gateway/v1/admin/coupons');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ items: [], page: 2, pageSize: 50, total: 0 });
  });

  it('lockUser() POSTs an optional reason', () => {
    service.lockUser('user-1', { reason: 'Fraud review' }, 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/admin/users/user-1/lock');
    expect(req.request.body).toEqual({ reason: 'Fraud review' });
    req.flush({});
  });

  it('unlockUser() POSTs to /unlock', () => {
    service.unlockUser('user-1', 'idem-1').subscribe();
    httpMock.expectOne('/api/bff/gateway/v1/admin/users/user-1/unlock').flush({});
  });

  it('replenishInventory() POSTs warehouseId/qtyAdded/reason', () => {
    service.replenishInventory('SKU-1', { warehouseId: 'wh-1', qtyAdded: 10, reason: 'Restock' }, 'idem-1').subscribe();
    const req = httpMock.expectOne('/api/bff/gateway/v1/admin/inventory/SKU-1/replenish');
    expect(req.request.body).toEqual({ warehouseId: 'wh-1', qtyAdded: 10, reason: 'Restock' });
    req.flush({});
  });

  it('listAdminActions() GETs /admin/actions with filters', () => {
    service.listAdminActions({ category: 'user-suspension' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/gateway/v1/admin/actions');
    expect(req.request.params.get('category')).toBe('user-suspension');
    req.flush({ items: [], page: 1, pageSize: 50, total: 0 });
  });

  it('listPrivacyRequests() GETs /admin/privacy-requests', () => {
    service.listPrivacyRequests({ status: 'pending' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/bff/gateway/v1/admin/privacy-requests');
    expect(req.request.params.get('status')).toBe('pending');
    req.flush({ items: [], page: 1, pageSize: 50, total: 0 });
  });
});
