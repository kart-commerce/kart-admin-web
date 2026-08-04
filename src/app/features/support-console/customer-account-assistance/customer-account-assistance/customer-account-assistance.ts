import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { UserProfileResponse } from '../../../../core/http/generated/user/v1';
import { CustomerAccountAssistanceService } from '../data/customer-account-assistance.service';

/**
 * SUP-2: Customer account assistance within the Support Agent's capped
 * grant (requirement-spec.md §3.3) — read-only profile/address lookup by
 * known userId; see data service's own header comment for why there is no
 * write action here (every self-service write endpoint is profile-owner
 * scoped only).
 */
@Component({
  selector: 'kart-customer-account-assistance',
  imports: [FormsModule, KartInput, Button, Spinner, Alert, Card, Badge],
  templateUrl: './customer-account-assistance.html',
  styleUrl: './customer-account-assistance.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerAccountAssistance {
  private readonly service = inject(CustomerAccountAssistanceService);

  protected userIdInput = '';
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly profile = signal<UserProfileResponse | null>(null);

  lookup(): void {
    const userId = this.userIdInput.trim();
    if (!userId) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.profile.set(null);
    this.service.getUserProfile(userId).subscribe({
      next: (profile) => {
        this.loading.set(false);
        this.profile.set(profile);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No account found with that user ID.'));
      },
    });
  }
}
