import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../../core/services/auth';
import { RegisterRequest } from '../../models/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);

  registerForm: FormGroup;
  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor() {

    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/app']);
    }

    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]], // Simple phone validation for 10 digits
        password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  get name() {
    return this.registerForm.get('name');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get phone() {
    return this.registerForm.get('phone');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(show => !show);
  }

  /**
   * Custom validator for password strength
   */
  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

    return !passwordValid
      ? {
        passwordStrength: {
          hasUpperCase,
          hasLowerCase,
          hasNumeric,
          hasSpecialChar,
        },
      }
      : null;
  }

  /**
   * Custom validator to check if passwords match
   */
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading.set(true);

    const { name, email, phone, password } = this.registerForm.value;

    // Create RegisterRequest object
    const registerRequest: RegisterRequest = {
      name,
      email,
      phone,
      password,
    };

    // Subscribe to the register Observable
    this.authService.register(registerRequest).subscribe({
      next: (response) => {
        if (response.activationCodeDelivered) {
          // Navigate to activation page
          this.router.navigate(['/auth/activation'], {
            queryParams: { email: response.email }
          });
        } else {
          this.errorMessage.set(response.message || 'Registration failed');
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        this.errorMessage.set(error?.message || 'Registration failed');
        this.isLoading.set(false);
      }
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
