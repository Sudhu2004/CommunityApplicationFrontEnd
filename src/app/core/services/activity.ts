import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap, catchError, switchMap, startWith } from 'rxjs/operators';
import { Api } from './api';
import { UserService } from './user';

export type ActivityType = 'COMMUNITY' | 'USER' | 'GROUP' | 'EVENTS';

export interface Activity {
  id: string; // UUID
  message: string;
  type: ActivityType;
  referenceId: string; // UUID
  createdAt: string; // ISO Date
}

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private api = inject(Api);
  private userService = inject(UserService);

  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private refresh$ = new Subject<void>();

  isLoading = this.loadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();
  onRefresh = this.refresh$.asObservable();

  private begin() {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
  }

  private done() {
    this.loadingSignal.set(false);
  }

  /**
   * Trigger a refresh of activities
   */
  triggerRefresh() {
    this.refresh$.next();
  }

  /**
   * GET /api/activities?type=USER
   */
  getActivitiesByType(type: ActivityType): Observable<Activity[]> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.get<Activity[]>('/api/activities', { type, userCode })),
      tap(() => this.done()),
      catchError((err) => {
        this.done();
        throw err;
      })
    );
  }

  /**
   * GET /api/activities/{referenceId}?type=GROUP
   */
  getActivitiesByReference(referenceId: string, type: ActivityType): Observable<Activity[]> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.get<Activity[]>(`/api/activities/${referenceId}`, { type, userCode })),
      tap(() => this.done()),
      catchError((err) => {
        this.done();
        throw err;
      })
    );
  }

  /**
   * GET /api/activities/{referenceId}/all
   */
  getAllActivitiesByReference(referenceId: string): Observable<Activity[]> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.get<Activity[]>(`/api/activities/${referenceId}/all`, { userCode })),
      tap(() => this.done()),
      catchError((err) => {
        this.done();
        throw err;
      })
    );
  }
}
