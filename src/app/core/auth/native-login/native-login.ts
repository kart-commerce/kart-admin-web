import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { Alert } from '../../../shared/ui/alert/alert';
import { Button } from '../../../shared/ui/button/button';
import { FormField } from '../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../shared/ui/kart-input.directive';
import { AuthService } from '../auth.service';
import { MfaChallenge } from '../models';
import { extractErrorMessage } from '../problem';

/**
 * AUTH-2: native email/password login (Support Agent role).
 * requirement-spec.md §5 — "Support Agent may use native login per the
 * platform's coarse role model." No "remember me" (security.md §2.2 — never
 * offered for either elevated-privilege role). MFA is mandatory for this
 * role (kart-identity-service api-contract.yaml's `/auth/login`), so a
 * successful credentials check may return a pending challenge instead of a
 * session — this component handles both steps.
 */
@Component({
  selector: 'kart-native-login',
  imports: [ReactiveFormsModule, FormField, KartInput, Button, Alert],
  templateUrl: './native-login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NativeLogin {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly step = signal<'credentials' | 'mfa'>('credentials');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  private challenge: MfaChallenge | null = null;

  protected readonly credentialsForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly mfaForm = this.fb.nonNullable.group({
    totpCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  submitCredentials(): void {
    if (this.credentialsForm.invalid || this.submitting()) {
      this.credentialsForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.authService.login(this.credentialsForm.getRawValue()).subscribe({
      next: (result) => {
        this.submitting.set(false);
        if (result.status === 'mfa-required') {
          this.challenge = result.challenge;
          this.step.set('mfa');
        } else {
          this.router.navigateByUrl('/');
        }
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Sign-in failed. Check your email and password.'));
      },
    });
  }

  submitMfa(): void {
    if (this.mfaForm.invalid || this.submitting() || !this.challenge) {
      this.mfaForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.authService.verifyMfa({ challengeId: this.challenge.challengeId, totpCode: this.mfaForm.getRawValue().totpCode }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Incorrect code. Try again.'));
      },
    });
  }
}
