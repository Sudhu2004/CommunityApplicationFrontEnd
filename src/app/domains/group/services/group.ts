import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Api } from '../../../core/services/api';
import { UserService } from '../../../core/services/user';
import { MemberRole, AddMemberRequest } from '../../community/models/community';
import {
  GroupDTO,
  GroupMembershipDTO,
  CreateGroupRequest,
  UpdateGroupRequest,
} from '../models/group';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
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
   * POST /api/groups
   */
  createGroup(payload: CreateGroupRequest): Observable<GroupDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.post<GroupDTO>('/api/groups', payload, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to create group'))
    );
  }

  /**
   * GET /api/groups/{groupCode}
   */
  getGroupByCode(groupCode: string): Observable<GroupDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.get<GroupDTO>(`/api/groups/${groupCode}`, null, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load group'))
    );
  }

  /**
   * PUT /api/groups/{groupCode}
   */
  updateGroup(groupCode: string, payload: UpdateGroupRequest): Observable<GroupDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.put<GroupDTO>(`/api/groups/${groupCode}`, payload, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to update group'))
    );
  }

  /**
   * DELETE /api/groups/{groupCode}
   */
  deleteGroup(groupCode: string): Observable<void> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.delete<void>(`/api/groups/${groupCode}`, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to delete group'))
    );
  }

  /**
   * GET /api/groups/community/{communityCode}
   */
  getGroupsByCommunity(communityCode: string): Observable<GroupDTO[]> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.get<GroupDTO[]>(`/api/groups/community/${communityCode}`, null, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load groups'))
    );
  }

  /**
   * GET /api/groups/user/{userCode}
   */
  getUserGroups(userCode: string): Observable<GroupDTO[]> {
    this.begin();
    return this.api.get<GroupDTO[]>(`/api/groups/user/${userCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load your groups'))
    );
  }

  /**
   * GET /api/groups/created-by/{userCode}
   */
  getGroupsCreatedByUser(userCode: string): Observable<GroupDTO[]> {
    this.begin();
    return this.api.get<GroupDTO[]>(`/api/groups/created-by/${userCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load created groups'))
    );
  }

  /**
   * GET /api/groups/community/{communityCode}/search?q={searchTerm}
   */
  searchGroupsInCommunity(communityCode: string, searchTerm: string): Observable<GroupDTO[]> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.get<GroupDTO[]>(`/api/groups/community/${communityCode}/search`, { q: searchTerm }, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Search failed'))
    );
  }

  // ─── Member management ──────────────────────────────────────────────────────

  /**
   * POST /api/groups/{groupCode}/request-join
   */
  requestToJoin(groupCode: string): Observable<GroupMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<GroupMembershipDTO>(`/api/groups/${groupCode}/request-join`, null, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to request join'))
    );
  }

  /**
   * POST /api/groups/{groupCode}/approve/{targetUserCode}
   */
  approveRequest(groupCode: string, targetUserCode: string): Observable<GroupMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<GroupMembershipDTO>(`/api/groups/${groupCode}/approve/${targetUserCode}`, null, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to approve request'))
    );
  }

  /**
   * POST /api/groups/{groupCode}/reject/{targetUserCode}
   */
  rejectRequest(groupCode: string, targetUserCode: string): Observable<void> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<void>(`/api/groups/${groupCode}/reject/${targetUserCode}`, null, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to reject request'))
    );
  }

  /**
   * POST /api/groups/{groupCode}/members
   * Direct add (Admin only)
   */
  addMember(groupCode: string, payload: AddMemberRequest): Observable<GroupMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<GroupMembershipDTO>(`/api/groups/${groupCode}/members`, payload, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to add member'))
    );
  }

  /**
   * POST /api/groups/{groupCode}/invite
   */
  inviteMember(groupCode: string, payload: AddMemberRequest): Observable<GroupMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<GroupMembershipDTO>(`/api/groups/${groupCode}/invite`, payload, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to invite member'))
    );
  }

  /**
   * POST /api/groups/{groupCode}/accept-invite
   */
  acceptInvitation(groupCode: string): Observable<GroupMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.post<GroupMembershipDTO>(`/api/groups/${groupCode}/accept-invite`, null, { userCode })
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to accept invitation'))
    );
  }

  /**
   * GET /api/groups/{groupCode}/members
   */
  getMembers(groupCode: string): Observable<GroupMembershipDTO[]> {
    this.begin();
    return this.api.get<GroupMembershipDTO[]>(`/api/groups/${groupCode}/members`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load members'))
    );
  }

  /**
   * GET /api/groups/{groupCode}/members/{userCode}
   */
  getUserMembership(groupCode: string, userCode: string): Observable<GroupMembershipDTO> {
    this.begin();
    return this.api.get<GroupMembershipDTO>(`/api/groups/${groupCode}/members/${userCode}`).pipe(
      tap(() => this.done()),
      catchError(this.handleErr('Failed to load membership'))
    );
  }

  /**
   * PUT /api/groups/{groupCode}/members/{memberCode}/role
   */
  updateMemberRole(groupCode: string, memberCode: string, role: MemberRole): Observable<GroupMembershipDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode =>
        this.api.put<GroupMembershipDTO>(
          `/api/groups/${groupCode}/members/${memberCode}/role`,
          JSON.stringify(role),
          { userCode, 'Content-Type': 'application/json' }
        )
      ),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to update role'))
    );
  }

  /**
   * DELETE /api/groups/{groupCode}/members/{memberCode}
   */
  removeMember(groupCode: string, memberCode: string): Observable<void> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.delete<void>(`/api/groups/${groupCode}/members/${memberCode}`, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Failed to remove member'))
    );
  }
}
