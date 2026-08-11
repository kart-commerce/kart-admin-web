import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Alert } from '../../../shared/ui/alert/alert';
import { Badge, BadgeVariant } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { Card } from '../../../shared/ui/card/card';
import { KartInput } from '../../../shared/ui/kart-input.directive';
import { Spinner } from '../../../shared/ui/spinner/spinner';
import { extractErrorMessage } from '../../../core/auth/problem';
import { AdminOrderStatusTarget } from '../../../core/http/generated/admin/v1';
import { Invoice, OrderStatus, OrderView } from '../../../core/http/generated/order/v1';
import { OrderReservation } from '../../../core/http/generated/inventory/v1';
import { ResolveFulfillmentException } from '../../order-exceptions/resolve-fulfillment-exception/resolve-fulfillment-exception/resolve-fulfillment-exception';
import { OrderManagementService } from '../data/order-management.service';

const STATUS_BADGE_VARIANT: Record<OrderStatus, BadgeVariant> = {
  Created: 'neutral',
  Reserved: 'neutral',
  Paid: 'primary',
  Shipped: 'primary',
  Delivered: 'success',
  FulfillmentException: 'danger',
  Cancelled: 'neutral',
  Refunded: 'warning',
};

/** Order statuses that stopped being an ops-recovery target — updateStatus/cancel/address-edit all disable themselves here. */
const TERMINAL_STATUSES: OrderStatus[] = ['Cancelled', 'Refunded'];
const ADMIN_STATUS_TARGETS: AdminOrderStatusTarget[] = ['Shipped', 'Delivered', 'FulfillmentException'];

interface ShippingAddressFormValue {
  recipientName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

const EMPTY_ADDRESS: ShippingAddressFormValue = {
  recipientName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  phone: '',
};

/**
 * Order Management (Admin) flow #7 — Order Details / Update Status / Cancel / Modify Address /
 * Generate Invoice / Assign Warehouse / Trigger Shipment / Handle Escalation, all in one screen.
 */
@Component({
  selector: 'kart-order-detail',
  imports: [FormsModule, KartInput, Button, Spinner, Alert, Card, Badge, RouterLink, DecimalPipe, DatePipe, ResolveFulfillmentException],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderManagementService = inject(OrderManagementService);

  protected readonly statusBadgeVariant = STATUS_BADGE_VARIANT;
  protected readonly adminStatusTargets = ADMIN_STATUS_TARGETS;

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly order = signal<OrderView | null>(null);

  protected cancelReason = '';
  protected readonly cancelling = signal(false);
  protected readonly cancelError = signal<string | null>(null);

  protected statusTarget: AdminOrderStatusTarget | '' = '';
  protected statusReason = '';
  protected readonly updatingStatus = signal(false);
  protected readonly statusError = signal<string | null>(null);

  protected addressForm: ShippingAddressFormValue = { ...EMPTY_ADDRESS };
  protected readonly savingAddress = signal(false);
  protected readonly addressError = signal<string | null>(null);

  protected readonly requestingShipment = signal(false);
  protected readonly shipmentError = signal<string | null>(null);

  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly loadingInvoice = signal(false);
  protected readonly invoiceError = signal<string | null>(null);

  protected readonly allocations = signal<OrderReservation[] | null>(null);
  protected readonly loadingAllocations = signal(false);
  protected readonly allocationsError = signal<string | null>(null);

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (orderId) {
      this.load(orderId);
    }
  }

  private load(orderId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.orderManagementService.getOrder(orderId).subscribe({
      next: (order) => {
        this.loading.set(false);
        this.applyOrder(order);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't load this order."));
      },
    });
  }

  private applyOrder(order: OrderView): void {
    this.order.set(order);
    const address = order.shippingAddress;
    this.addressForm = address
      ? {
          recipientName: address.recipientName,
          line1: address.line1,
          line2: address.line2 ?? '',
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone ?? '',
        }
      : { ...EMPTY_ADDRESS };
  }

  protected isTerminal(status: OrderStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
  }

  onOrderUpdated(updated: OrderView): void {
    this.applyOrder(updated);
  }

  cancel(): void {
    const order = this.order();
    if (!order) {
      return;
    }
    if (!confirm(`Cancel order ${order.orderId}? This releases any held reservation and refunds the customer.`)) {
      return;
    }

    this.cancelling.set(true);
    this.cancelError.set(null);
    this.orderManagementService.cancelOrder(order.orderId, this.cancelReason.trim() || null).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.load(order.orderId);
      },
      error: (error: unknown) => {
        this.cancelling.set(false);
        this.cancelError.set(extractErrorMessage(error, "Couldn't cancel this order."));
      },
    });
  }

  updateStatus(): void {
    const order = this.order();
    if (!order || !this.statusTarget || !this.statusReason.trim()) {
      return;
    }

    this.updatingStatus.set(true);
    this.statusError.set(null);
    this.orderManagementService.updateStatus(order.orderId, this.statusTarget, this.statusReason.trim()).subscribe({
      next: () => {
        this.updatingStatus.set(false);
        this.statusReason = '';
        this.load(order.orderId);
      },
      error: (error: unknown) => {
        this.updatingStatus.set(false);
        this.statusError.set(extractErrorMessage(error, "Couldn't update this order's status."));
      },
    });
  }

  saveAddress(): void {
    const order = this.order();
    if (!order) {
      return;
    }

    this.savingAddress.set(true);
    this.addressError.set(null);
    this.orderManagementService
      .updateShippingAddress(order.orderId, {
        recipientName: this.addressForm.recipientName.trim(),
        line1: this.addressForm.line1.trim(),
        line2: this.addressForm.line2.trim() || null,
        city: this.addressForm.city.trim(),
        state: this.addressForm.state.trim(),
        postalCode: this.addressForm.postalCode.trim(),
        country: this.addressForm.country.trim(),
        phone: this.addressForm.phone.trim() || null,
      })
      .subscribe({
        next: () => {
          this.savingAddress.set(false);
          this.load(order.orderId);
        },
        error: (error: unknown) => {
          this.savingAddress.set(false);
          this.addressError.set(extractErrorMessage(error, "Couldn't update this order's shipping address."));
        },
      });
  }

  requestShipment(): void {
    const order = this.order();
    if (!order) {
      return;
    }

    this.requestingShipment.set(true);
    this.shipmentError.set(null);
    this.orderManagementService.requestShipment(order.orderId).subscribe({
      next: () => {
        this.requestingShipment.set(false);
        this.load(order.orderId);
      },
      error: (error: unknown) => {
        this.requestingShipment.set(false);
        this.shipmentError.set(extractErrorMessage(error, "Couldn't request shipment for this order."));
      },
    });
  }

  viewInvoice(): void {
    const order = this.order();
    if (!order) {
      return;
    }

    this.loadingInvoice.set(true);
    this.invoiceError.set(null);
    this.orderManagementService.getInvoice(order.orderId).subscribe({
      next: (invoice) => {
        this.loadingInvoice.set(false);
        this.invoice.set(invoice);
      },
      error: (error: unknown) => {
        this.loadingInvoice.set(false);
        this.invoiceError.set(extractErrorMessage(error, 'No invoice is available for this order yet — it must have completed payment first.'));
      },
    });
  }

  printInvoice(): void {
    window.print();
  }

  viewWarehouseAllocations(): void {
    const order = this.order();
    if (!order) {
      return;
    }

    this.loadingAllocations.set(true);
    this.allocationsError.set(null);
    this.orderManagementService.getWarehouseAllocations(order.orderId).subscribe({
      next: (allocations) => {
        this.loadingAllocations.set(false);
        this.allocations.set(allocations);
      },
      error: (error: unknown) => {
        this.loadingAllocations.set(false);
        this.allocationsError.set(extractErrorMessage(error, "Couldn't load this order's warehouse allocations."));
      },
    });
  }
}
