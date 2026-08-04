import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { RequiresGrant } from '../../../../core/auth/requires-grant.directive';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { UserProfileResponse } from '../../../../core/http/generated/user/v1';
import { UserLockUnlockService } from '../data/user-lock-unlock.service';

/** IDN-1: User Lock/Unlock — by known userId (no user directory endpoint exists platform-wide). */
@Component({
  selector: 'kart-user-lock-unlock',
  imports: [FormsModule, KartInput, Button, Alert, Card, Spinner, RequiresGrant],
  templateUrl: './user-lock-unlock.html',
  styleUrl: './user-lock-unlock.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserLockUnlock {
  private readonly service = inject(UserLockUnlockService);

  protected userIdInput = '';
  protected reasonInput = '';
  protected readonly loading = signal(false);
  protected readonly lookupError = signal<string | null>(null);
  protected readonly profile = signal<UserProfileResponse | null>(null);

  protected readonly submittingAction = signal<'lock' | 'unlock' | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionSuccess = signal<string | null>(null);

  lookup(): void {
    const userId = this.userIdInput.trim();
    if (!userId) {
      return;
    }
    this.loading.set(true);
    this.lookupError.set(null);
    this.profile.set(null);
    this.actionSuccess.set(null);
    this.service.getUserProfile(userId).subscribe({
      next: (profile) => {
        this.loading.set(false);
        this.profile.set(profile);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.lookupError.set(extractErrorMessage(error, 'No account found with that user ID.'));
      },
    });
  }

  lock(): void {
    const userId = this.userIdInput.trim();
    if (!userId || !confirm(`Lock this account (${userId})? They will be signed out immediately.`)) {
      return;
    }
    this.submittingAction.set('lock');
    this.actionError.set(null);
    this.service.lockUser(userId, this.reasonInput || undefined).subscribe({
      next: () => {
        this.submittingAction.set(null);
        this.actionSuccess.set('Account locked.');
      },
      error: (error: unknown) => {
        this.submittingAction.set(null);
        this.actionError.set(extractErrorMessage(error, 'Could not lock this account.'));
      },
    });
  }

  unlock(): void {
    const userId = this.userIdInput.trim();
    if (!userId) {
      return;
    }
    this.submittingAction.set('unlock');
    this.actionError.set(null);
    this.service.unlockUser(userId).subscribe({
      next: () => {
        this.submittingAction.set(null);
        this.actionSuccess.set('Account unlocked.');
      },
      error: (error: unknown) => {
        this.submittingAction.set(null);
        this.actionError.set(extractErrorMessage(error, 'Could not unlock this account.'));
      },
    });
  }
}
