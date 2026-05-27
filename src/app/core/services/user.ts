import { Injectable, inject, signal } from '@angular/core';
import { Api } from './api';
import { Observable, throwError, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Auth, UserData } from './auth';
import { UserProfile } from '../../domains/profile/models/profile';

export interface User {
  userCode: string;
  email: string;
  phone?: string;
  name?: string;
  profilePhotoUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  profilePhotoUrl?: string;
}

interface UserCodeResponse {
  shortCode: string | null;
  exists: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private api = inject(Api);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private authService = inject(Auth)

  isLoading = this.loadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();

  /**
   * Get user by code
   */
  getUserByCode(userCode: string): Observable<User> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.api.get<User>(`/api/user/${userCode}`).pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to fetch user');
        this.loadingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Observable<User> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.api.get<User>(`/api/user/email/${email}`).pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to fetch user by email');
        this.loadingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Update user profile
   */
  updateUser(userCode: string, updateData: UpdateUserPayload): Observable<User> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.api.put<User>(`/api/user/${userCode}`, updateData).pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to update user');
        this.loadingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Get all users
   */
  getAllUsers(): Observable<User[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.api.get<User[]>('/api/user/all').pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to fetch users');
        this.loadingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Get user code from current authenticated user
   */
  getUserCode(): Observable<string> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const userData = this.authService.getCurrentUserData();

    if (userData?.userCode) {
      this.loadingSignal.set(false);
      return of(userData.userCode);
    }

    const email = this.authService.getUserEmail();

    if (!email) {
      this.loadingSignal.set(false);
      this.errorSignal.set('User email not available. Please login again.');
      return throwError(() => new Error('User email not available'));
    }

    return this.getUserCodeByEmail(email).pipe(
      map((res) => {
        if (!res.exists || !res.shortCode) {
          throw new Error('User not found');
        }
        return res.shortCode;
      }),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to fetch user code');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get user code by email
   */
  getUserCodeByEmail(email: string): Observable<UserCodeResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.api.get<UserCodeResponse>(
      '/api/user/userCodeByEmail',
      { email }
    ).pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to fetch user code');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get complete user data by user code
   */
  getUserDataByCode(userCode: string): Observable<UserData> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.api.get<UserData>(`/api/user/${userCode}`).pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to fetch user data');
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  getUserProfileByCode(userCode: string): Observable<UserProfile> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    return this.api.get<any>(`/api/user/${userCode}`).pipe(
      map((dto) => ({
        id: dto.userCode,
        email: dto.email,
        name: dto.name,
        joinedAt: dto.createdAt,
        communityCount: dto.communityCount ?? -1,
        groupCount: dto.groupCount ?? -1,
        userCode: dto.userCode,
        profilePhotoUrl: dto.profilePhotoUrl
      })),
      tap(() => this.loadingSignal.set(false)),
      catchError((error) => {
        this.errorSignal.set(error?.message || 'Failed to fetch user profile');
        this.loadingSignal.set(false)
        return throwError(() => error);
      })
    );
  }
}
