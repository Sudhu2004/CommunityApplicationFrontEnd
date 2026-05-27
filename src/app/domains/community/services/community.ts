import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Api } from '../../../core/services/api';
import { UserService } from '../../../core/services/user';
import {
  CommunityDTO,
  CommunityMembershipDTO,
  CreateCommunityRequest,
  UpdateCommunityRequest,
  AddMemberRequest,
  MemberRole,
} from '../models/community';

@Injectable({
  providedIn: 'root',
})
export class CommunityService {
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

  // ─── Community CRUD ─────────────────────────────────────────────────────────

  /**
   * POST /api/communities
   */
  createCommunity(payload: CreateCommunityRequest): Observable<CommunityDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<CommunityDTO>('/api/communities', payload, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to create community'))
    );
  }

  /**
   * GET /api/communities/{communityCode}
   */
  getCommunityByCode(communityCode: string): Observable<CommunityDTO> {
    this.begin();
    return this.api.get<CommunityDTO>(`/api/communities/${communityCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load community'))
    );
  }

  /**
   * GET /api/communities
   */
  getAllCommunities(): Observable<CommunityDTO[]> {
    this.begin();
    return this.api.get<CommunityDTO[]>('/api/communities').pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load communities'))
    );
  }

  /**
   * GET /api/communities/search?q={searchTerm}
   */
  searchCommunities(searchTerm: string): Observable<CommunityDTO[]> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.get<CommunityDTO[]>('/api/communities/search', { q: searchTerm, userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Search failed'))
    );
  }

  /**
   * GET /api/communities/created-by/{userCode}
   */
  getCommunitiesCreatedByUser(userCode: string): Observable<CommunityDTO[]> {
    this.begin();
    return this.api.get<CommunityDTO[]>(`/api/communities/created-by/${userCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load your communities'))
    );
  }

  /**
   * GET /api/communities/user/{userCode}
   */
  getUserCommunities(userCode: string): Observable<CommunityDTO[]> {
    this.begin();
    return this.api.get<CommunityDTO[]>(`/api/communities/user/${userCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load memberships'))
    );
  }

  /**
   * PUT /api/communities/{communityCode}
   */
  updateCommunity(communityCode: string, payload: UpdateCommunityRequest): Observable<CommunityDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.put<CommunityDTO>(`/api/communities/${communityCode}`, payload, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to update community'))
    );
  }

  /**
   * DELETE /api/communities/{communityCode}
   */
  deleteCommunity(communityCode: string): Observable<void> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.delete<void>(`/api/communities/${communityCode}`, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to delete community'))
    );
  }

  // ─── Member management ──────────────────────────────────────────────────────

  /**
   * POST /api/communities/{communityCode}/request-join
   */
  requestToJoin(communityCode: string): Observable<CommunityMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<CommunityMembershipDTO>(`/api/communities/${communityCode}/request-join`, null, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to request join'))
    );
  }

  /**
   * POST /api/communities/{communityCode}/approve/{targetUserCode}
   */
  approveRequest(communityCode: string, targetUserCode: string): Observable<CommunityMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<CommunityMembershipDTO>(`/api/communities/${communityCode}/approve/${targetUserCode}`, null, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to approve request'))
    );
  }

  /**
   * POST /api/communities/{communityCode}/reject/{targetUserCode}
   */
  rejectRequest(communityCode: string, targetUserCode: string): Observable<void> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<void>(`/api/communities/${communityCode}/reject/${targetUserCode}`, null, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to reject request'))
    );
  }

  /**
   * POST /api/communities/{communityCode}/invite
   */
  inviteMember(communityCode: string, payload: AddMemberRequest): Observable<CommunityMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<CommunityMembershipDTO>(`/api/communities/${communityCode}/invite`, payload, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to invite member'))
    );
  }

  /**
   * POST /api/communities/{communityCode}/accept-invite
   */
  acceptInvitation(communityCode: string): Observable<CommunityMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<CommunityMembershipDTO>(`/api/communities/${communityCode}/accept-invite`, null, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to accept invitation'))
    );
  }

  /**
   * GET /api/communities/{communityCode}/pending-requests
   */
  getPendingRequests(communityCode: string): Observable<CommunityMembershipDTO[]> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.get<CommunityMembershipDTO[]>(`/api/communities/${communityCode}/pending-requests`, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load pending requests'))
    );
  }

  /**
   * GET /api/communities/{communityCode}/members
   */
  getMembers(communityCode: string): Observable<CommunityMembershipDTO[]> {
    this.begin();
    return this.api.get<CommunityMembershipDTO[]>(`/api/communities/${communityCode}/members`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load members'))
    );
  }

  /**
   * GET /api/communities/{communityCode}/members/{userCode}
   */
  getUserMembership(communityCode: string, userCode: string): Observable<CommunityMembershipDTO> {
    this.begin();
    return this.api.get<CommunityMembershipDTO>(`/api/communities/${communityCode}/members/${userCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load membership'))
    );
  }

  /**
   * PUT /api/communities/{communityCode}/members/{memberCode}/role
   */
  updateMemberRole(communityCode: string, memberCode: string, role: MemberRole): Observable<CommunityMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.put<CommunityMembershipDTO>(
          `/api/communities/${communityCode}/members/${memberCode}/role`,
          `"${role}"`,
          { userCode, 'Content-Type': 'application/json' }
        )
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to update role'))
    );
  }

  /**
   * DELETE /api/communities/{communityCode}/members/{memberCode}
   */
  removeMember(communityCode: string, memberCode: string): Observable<void> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.delete<void>(`/api/communities/${communityCode}/members/${memberCode}`, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to remove member'))
    );
  }
}
