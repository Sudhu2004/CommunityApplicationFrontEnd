import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Api } from '../../../core/services/api';
import { UserService } from '../../../core/services/user';
import {
  EventDTO,
  EventAttendanceDTO,
  CreateEventRequest,
  UpdateEventRequest,
  MarkAttendanceRequest,
  AttendanceStatsDTO,
} from '../models/event';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private api = inject(Api);
  private userService = inject(UserService);

  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  isLoading = this.loadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();

  private begin() {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
  }

  private handleErr(msg: string) {
    return (error: any) => {
      this.errorSignal.set(error.message || msg);
      this.loadingSignal.set(false);
      throw error;
    };
  }

  private done() {
    this.loadingSignal.set(false);
  }

  /**
   * POST /api/events
   */
  createEvent(payload: CreateEventRequest): Observable<EventDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.post<EventDTO>('/api/events', payload, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to create event'))
    );
  }

  /**
   * GET /api/events/{eventCode}
   */
  getEventByCode(eventCode: string): Observable<EventDTO> {
    this.begin();
    return this.api.get<EventDTO>(`/api/events/${eventCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load event'))
    );
  }

  /**
   * PUT /api/events/{eventCode}
   */
  updateEvent(eventCode: string, payload: UpdateEventRequest): Observable<EventDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.put<EventDTO>(`/api/events/${eventCode}`, payload, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to update event'))
    );
  }

  /**
   * DELETE /api/events/{eventCode}
   */
  deleteEvent(eventCode: string): Observable<void> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.delete<void>(`/api/events/${eventCode}`, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to delete event'))
    );
  }

  /**
   * GET /api/events/group/{groupCode}
   */
  getEventsByGroup(groupCode: string): Observable<EventDTO[]> {
    this.begin();
    return this.api.get<EventDTO[]>(`/api/events/group/${groupCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load events'))
    );
  }

  /**
   * GET /api/events/group/{groupCode}/upcoming
   */
  getUpcomingEventsByGroup(groupCode: string): Observable<EventDTO[]> {
    this.begin();
    return this.api.get<EventDTO[]>(`/api/events/group/${groupCode}/upcoming`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load upcoming events'))
    );
  }

  /**
   * GET /api/events/community/{communityCode}
   */
  getEventsByCommunity(communityCode: string): Observable<EventDTO[]> {
    this.begin();
    return this.api.get<EventDTO[]>(`/api/events/community/${communityCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load events'))
    );
  }

  /**
   * GET /api/events/community/{communityCode}/upcoming
   */
  getUpcomingEventsByCommunity(communityCode: string): Observable<EventDTO[]> {
    this.begin();
    return this.api.get<EventDTO[]>(`/api/events/community/${communityCode}/upcoming`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load upcoming events'))
    );
  }

  // ─── Attendance ─────────────────────────────────────────────────────────────

  /**
   * POST /api/events/{eventCode}/attendance
   */
  markAttendance(eventCode: string, payload: MarkAttendanceRequest): Observable<EventAttendanceDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.post<EventAttendanceDTO>(`/api/events/${eventCode}/attendance`, payload, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to mark attendance'))
    );
  }

  /**
   * GET /api/events/{eventCode}/attendance
   */
  getEventAttendance(eventCode: string): Observable<EventAttendanceDTO[]> {
    this.begin();
    return this.api.get<EventAttendanceDTO[]>(`/api/events/${eventCode}/attendance`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load attendance'))
    );
  }

  /**
   * GET /api/events/{eventCode}/attendance/group/{groupCode}
   */
  getEventAttendanceByGroup(eventCode: string, groupCode: string): Observable<EventAttendanceDTO[]> {
    this.begin();
    return this.api.get<EventAttendanceDTO[]>(`/api/events/${eventCode}/attendance/group/${groupCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load group attendance'))
    );
  }

  /**
   * GET /api/events/{eventCode}/attendance/stats
   */
  getAttendanceStats(eventCode: string): Observable<AttendanceStatsDTO> {
    this.begin();
    return this.api.get<AttendanceStatsDTO>(`/api/events/${eventCode}/attendance/stats`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load attendance stats'))
    );
  }

  /**
   * PATCH /api/events/{eventCode}/attendance?enabled={boolean}
   */
  toggleAttendance(eventCode: string, enabled: boolean): Observable<EventDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.patch<EventDTO>(`/api/events/${eventCode}/attendance`, null, { 
        params: { enabled },
        headers: { userCode }
      })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to toggle attendance'))
    );
  }
}
