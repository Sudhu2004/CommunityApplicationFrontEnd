import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Auth } from '../../../../core/services/auth';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-activation',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './activation.html',
  styleUrls: ['./activation.css']
})
export class Activation implements OnInit, OnDestroy {
  private authService = inject(Auth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  activationForm!: FormGroup;
  isLoadingState = signal(false);
  error: string | null = null;
  activationSuccess = false;
  resendCountdown = 0;
  pendingEmail: string | null = null;

  private subscriptions = new Subscription();
  private countdownInterval?: number;

  ngOnInit(): void {
    // Try to get email from query params first, then fall back to service
    const queryParamsSub = this.route.queryParams.subscribe(params => {
      this.pendingEmail = params['email'] || this.authService.getPendingEmailForActivation();
    });
    this.subscriptions.add(queryParamsSub);

    // Check if activation is pending and email exists
    if (!this.authService.isActivationPendingCheck() || !this.pendingEmail) {
      this.router.navigate(['/auth/register']);
      return;
    }

    // Initialize form with 6-digit code validation
    this.activationForm = this.fb.group({
      code: ['', [
        Validators.required,
        Validators.pattern('^[0-9]{6}$'),
        Validators.minLength(6),
        Validators.maxLength(6)
      ]]
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions and intervals
    this.subscriptions.unsubscribe();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  /**
   * Verify the activation code
   */
  onVerifyActivation(): void {
    if (this.activationForm.invalid || !this.pendingEmail) {
      this.markFormAsTouched();
      return;
    }

    const code = this.activationForm.get('code')?.value;
    this.isLoadingState.set(true);
    this.error = null;

    const verifySub = this.authService.verifyActivationCode(this.pendingEmail, code).subscribe({
      next: (response) => {
        this.isLoadingState.set(false);
        if (response && response.accessToken) {
          this.activationSuccess = true;
          this.error = null;

          // Auto-redirect after 2 seconds
          setTimeout(() => {
            this.onContinue();
          }, 2000);
        }
      },
      error: (error) => {
        this.isLoadingState.set(false);
        this.error = error.error?.message || error.message || 'Verification failed. Please try again.';

        // Clear the form on error
        this.activationForm.get('code')?.setValue('');
      }
    });

    this.subscriptions.add(verifySub);
  }

  /**
   * Resend activation code
   */
  onResendCode(): void {
    if (!this.pendingEmail || this.resendCountdown > 0) {
      return;
    }

    this.isLoadingState.set(true);
    this.error = null;

    const resendSub = this.authService.resendActivationCode(this.pendingEmail).subscribe({
      next: (response) => {
        this.isLoadingState.set(false);
        if (response && response.activationCodeDelivered) {
          this.error = null;
          this.startResendCountdown();

          // Show success feedback (you can add a success message property if needed)
        } else {
          this.error = response.message || 'Failed to resend code';
        }
      },
      error: (error) => {
        this.isLoadingState.set(false);
        this.error = error.error?.message || error.message || 'Failed to resend code. Please try again.';
      }
    });

    this.subscriptions.add(resendSub);
  }

  /**
   * Start countdown timer for resend button
   */
  private startResendCountdown(): void {
    this.resendCountdown = 60;

    // Clear any existing interval
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = window.setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = undefined;
        }
      }
    }, 1000);
  }

  /**
   * Navigate to dashboard after successful activation
   */
  onContinue(): void {
    // Navigate to login or dashboard
    if (localStorage.getItem('token')) {
      this.router.navigate(['/app']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Navigate back to registration
   */
  onBackToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  /**
   * Check if a form field is invalid and touched
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.activationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Get error message for a specific field
   */
  getFieldError(fieldName: string): string | null {
    const field = this.activationForm.get(fieldName);

    if (!field || !field.errors || !field.touched) {
      return null;
    }

    if (field.errors['required']) {
      return 'Activation code is required';
    }

    if (field.errors['pattern'] || field.errors['minlength'] || field.errors['maxlength']) {
      return 'Please enter a valid 6-digit code';
    }

    return 'Invalid activation code';
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormAsTouched(): void {
    Object.keys(this.activationForm.controls).forEach(key => {
      this.activationForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Check if resend button should be disabled
   */
  get isResendDisabled(): boolean {
    return this.resendCountdown > 0 || this.isLoadingState();
  }

  /**
   * Format countdown for display
   */
  get resendButtonText(): string {
    if (this.resendCountdown > 0) {
      return `Resend code (${this.resendCountdown}s)`;
    }
    return 'Resend code';
  }

  /**
   * Handle input to auto-format and limit to 6 digits
   */
  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 6);
    this.activationForm.get('code')?.setValue(value, { emitEvent: false });

    // Auto-submit when 6 digits are entered
    if (value.length === 6) {
      this.onVerifyActivation();
    }
  }

  onSubmit() {
    this.onVerifyActivation();
  }

  errorMessage() {
    return this.error;
  }

  successMessage() {
    return this.activationSuccess;
  }

  get code() {
    return this.activationForm.get('code');
  }

  isLoading() {
    return this.isLoadingState;
  }

  resendCode(): void {
    this.onResendCode();
  }

  email(): string | null {
    return this.pendingEmail;
  }
}
