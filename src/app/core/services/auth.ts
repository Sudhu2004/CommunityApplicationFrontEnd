import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Api } from './api';
import { LoginRequest, RegisterRequest, LoginResponse, SignUpResponse } from '../../domains/auth/models/auth';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';

export interface ActivationRequest {
  email: string;
  code: string;
}

export interface ResendCodeRequest {
  email: string;
}

// Complete user data interface matching backend UserDTO
export interface UserData {
  id: string;
  email: string;
  name: string;
  phone?: string;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  userCode: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private router = inject(Router);
  private api = inject(Api);

  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly USER_EMAIL_KEY = 'auth_user_email'; // New key for just email
  private readonly USER_DATA_KEY = 'auth_user_data';
  private readonly PENDING_EMAIL_KEY = 'pending_email';
  private readonly ACTIVATION_PENDING_KEY = 'activation_pending';

  // Signals for authentication state
  private isAuthenticatedSignal = signal(this.getStoredToken() !== null);
  private currentUserSignal = signal(this.getStoredUser());
  private currentUserEmailSignal = signal<string | null>(this.getStoredUserEmail()); // New signal for email
  private currentUserDataSignal = signal<UserData | null>(this.getStoredUserData());
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private activationPendingSignal = signal(this.getActivationPending());
  private pendingEmailSignal = signal(this.getPendingEmail());

  // Computed signals
  isAuthenticated = computed(() => this.isAuthenticatedSignal());
  currentUser = computed(() => this.currentUserSignal());
  currentUserEmail = computed(() => this.currentUserEmailSignal()); // New computed signal
  currentUserData = computed(() => this.currentUserDataSignal());
  isLoading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());
  isActivationPending = computed(() => this.activationPendingSignal());
  pendingEmail = computed(() => this.pendingEmailSignal());

  /**
   * Fetch and persist complete user data from backend
   * This method fetches the full UserDTO and stores it in localStorage and signal
   */
  fetchAndPersistUserData(userCode: string): Observable<UserData> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.api.get<UserData>(`/api/user/${userCode}`).pipe(
      tap((userData) => {
        // Store complete user data in localStorage
        localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
        // Update signal
        this.currentUserDataSignal.set(userData);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to fetch user data');
        this.loadingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Fetch user data by email and persist it
   */
  fetchAndPersistUserDataByEmail(email: string): Observable<UserData> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.api.get<UserData>(`/api/user/email/${email}`).pipe(
      tap((userData) => {
        // Store complete user data in localStorage
        localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
        // Update signal
        this.currentUserDataSignal.set(userData);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to fetch user data');
        this.loadingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Get the current complete user data
   * Returns the stored UserData or null if not available
   */
  getCurrentUserData(): UserData | null {
    return this.currentUserDataSignal();
  }

  /**
   * Get the current user email
   */
  getUserEmail(): string | null {
    return this.currentUserEmailSignal();
  }

  /**
   * Register a new user with email and password
   */
  register(registerData: RegisterRequest): Observable<SignUpResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // Check if user already exists
    this.api.get<Boolean>('/api/user/exists/' + registerData.email).subscribe({
      next: (exists) => {
        if (exists) {
          this.errorSignal.set('User with this email already exists');
          this.loadingSignal.set(false);
          return;
        }
      },
      error: (error) => {
        this.errorSignal.set(error.message || 'Registration failed');
        this.loadingSignal.set(false);
      }
    });

    return this.api.post<SignUpResponse>('/api/auth/register', registerData).pipe(
      tap((response) => {
        if (response) {

          if (response.activationCodeDelivered) {
            // If activation code was delivered, we can proceed with pending activation flow
            localStorage.setItem(this.ACTIVATION_PENDING_KEY, 'true');
            localStorage.setItem(this.PENDING_EMAIL_KEY, response.email);
            this.activationPendingSignal.set(true);
            this.pendingEmailSignal.set(response.email);
          } else {
            // If activation code was not delivered, we can consider the user as registered but not activated
            // This is a fallback scenario - ideally, the backend should ensure activation code is sent
            this.errorSignal.set('Registration successful but failed to send activation code. Please contact support.');
          }
          this.isAuthenticatedSignal.set(false);
          this.currentUserSignal.set(null);
          this.loadingSignal.set(false);
        }
      }),
      catchError((error) => {
        // Handle the error response structure from GlobalExceptionHandler
        this.errorSignal.set(error.message);
        this.loadingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Authenticate user with email and password
   * Based on Python test: test_authenticate_user
   */
  login(loginRequest: LoginRequest): Observable<LoginResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const payload = {
      email: loginRequest.username, // Using username as email
      password: loginRequest.password
    };

    return this.api.post<LoginResponse>('/api/auth/authenticate', payload).pipe(
      tap((response) => {
        localStorage.setItem(this.TOKEN_KEY, response.accessToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.userEmail));
        localStorage.setItem(this.USER_EMAIL_KEY, response.userEmail); // Store email separately
        this.isAuthenticatedSignal.set(true);
        this.currentUserSignal.set(response.userEmail);
        this.currentUserEmailSignal.set(response.userEmail); // Set email signal
        
        // Fetch complete user data in the background (don't block login)
        this.fetchAndPersistUserDataByEmail(response.userEmail).subscribe();
        
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.message);
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verify activation code sent to user's email
   */
  verifyActivationCode(email: string, code: string): Observable<LoginResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const payload: ActivationRequest = {
      email: email,
      code: code
    };

    return this.api.post<LoginResponse>('/api/auth/verify-activation', payload).pipe(
      tap((response) => {
        if (response && response.accessToken) {
          // Clear activation pending state
          localStorage.removeItem(this.ACTIVATION_PENDING_KEY);
          localStorage.removeItem(this.PENDING_EMAIL_KEY);

          localStorage.setItem(this.TOKEN_KEY, response.accessToken);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.userEmail));
          localStorage.setItem(this.USER_EMAIL_KEY, response.userEmail); // Store email separately
          this.isAuthenticatedSignal.set(true);
          this.currentUserSignal.set(response.userEmail);
          this.currentUserEmailSignal.set(response.userEmail); // Set email signal

          this.activationPendingSignal.set(false);
          this.pendingEmailSignal.set(null);
          this.errorSignal.set(null);
          
          // Fetch complete user data in the background (don't block activation)
          this.fetchAndPersistUserDataByEmail(response.userEmail).subscribe();
        }
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Activation verification failed');
        this.loadingSignal.set(false);
        throw error;
      })
    );
  }
  
  /**
   * Resend activation code to user's email
   */
  resendActivationCode(email: string): Observable<SignUpResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const payload: ResendCodeRequest = {
      email: email
    };

    return this.api.post<SignUpResponse>('/api/auth/resend-activation', payload).pipe(
      tap((response) => {
        if (response && response.activationCodeDelivered) {
          this.errorSignal.set(null);
          // Update pending email
          localStorage.setItem(this.PENDING_EMAIL_KEY, email);
          this.pendingEmailSignal.set(email);
        } else {
          this.errorSignal.set(response.message || 'Failed to resend activation code');
        }
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Resend activation failed');
        this.loadingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Logout the current user
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.USER_EMAIL_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
    localStorage.removeItem(this.ACTIVATION_PENDING_KEY);
    localStorage.removeItem(this.PENDING_EMAIL_KEY);
    this.isAuthenticatedSignal.set(false);
    this.currentUserSignal.set(null);
    this.currentUserEmailSignal.set(null);
    this.currentUserDataSignal.set(null);
    this.activationPendingSignal.set(false);
    this.pendingEmailSignal.set(null);
    this.errorSignal.set(null);
    this.router.navigate(['/login']);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticatedCheck(): boolean {
    return this.isAuthenticatedSignal();
  }

  /**
   * Check if user activation is pending
   */
  isActivationPendingCheck(): boolean {
    return this.activationPendingSignal();
  }

  /**
   * Get the stored authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get the current user
   */
  getUser() {
    return this.currentUserSignal();
  }

  /**
   * Get the pending email for activation
   */
  getPendingEmailForActivation(): string | null {
    return this.pendingEmailSignal();
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Refresh the authentication state (useful after page reload)
   */
  refreshAuthState(): void {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    const email = this.getStoredUserEmail();
    const userData = this.getStoredUserData();
    const activationPending = this.getActivationPending();
    const pendingEmail = this.getPendingEmail();

    if (token && user) {
      this.isAuthenticatedSignal.set(true);
      this.currentUserSignal.set(user);
      this.currentUserEmailSignal.set(email);
      this.currentUserDataSignal.set(userData);

      // If we have email but no user data, fetch it
      if (email && !userData) {
        this.fetchAndPersistUserDataByEmail(email).subscribe();
      }
    } else {
      this.isAuthenticatedSignal.set(false);
      this.currentUserSignal.set(null);
      this.currentUserEmailSignal.set(null);
      this.currentUserDataSignal.set(null);
    }

    this.activationPendingSignal.set(activationPending);
    this.pendingEmailSignal.set(pendingEmail);
  }

  /**
   * Get token from localStorage
   */
  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get user from localStorage
   */
  private getStoredUser() {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Get user email from localStorage
   */
  private getStoredUserEmail(): string | null {
    return localStorage.getItem(this.USER_EMAIL_KEY);
  }

  /**
   * Get complete user data from localStorage
   */
  private getStoredUserData(): UserData | null {
    const userDataJson = localStorage.getItem(this.USER_DATA_KEY);
    return userDataJson ? JSON.parse(userDataJson) : null;
  }

  /**
   * Get activation pending state from localStorage
   */
  private getActivationPending(): boolean {
    return localStorage.getItem(this.ACTIVATION_PENDING_KEY) === 'true';
  }

  /**
   * Get pending email from localStorage
   */
  private getPendingEmail(): string | null {
    return localStorage.getItem(this.PENDING_EMAIL_KEY);
  }
}
