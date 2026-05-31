import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommunityService } from '../../services/community';
import { GroupService } from '../../../group/services/group';
import { UserService } from '../../../../core/services/user';
import { EventService } from '../../../event/services/event';
import { MessagingService } from '../../../messaging/services/messaging';
import { BreadcrumbService } from '../../../../core/services/breadcrumb';
import {
  CommunityDTO,
  CommunityMembershipDTO,
  MemberRole,
} from '../../models/community';
import { GroupDTO } from '../../../group/models/group';
import { EventDTO } from '../../../event/models/event';
import { GroupCard } from '../../../group/components/group-card/group-card';
import { CreateGroupModal } from '../../../group/components/create-group-modal/create-group-modal';
import { CreateEventModal } from '../../../event/components/create-event-modal/create-event-modal';
import { MessageThread } from '../../../messaging/components/message-thread/message-thread';
import { EventCard } from '../../../event/components/event-card/event-card';
import { InviteModal } from '../../../../shared/components/invite-modal/invite-modal';
import { MembersModal } from '../members-modal/members-modal';
import { computed } from '@angular/core';
import { ActivityService } from '../../../../core/services/activity';

@Component({
  selector: 'app-community-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, GroupCard, CreateGroupModal, CreateEventModal, MessageThread, EventCard, InviteModal, MembersModal],
  templateUrl: './community-detail.html',
  styleUrl: './community-detail.css',
})
export class CommunityDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private communityService = inject(CommunityService);
  private groupService = inject(GroupService);
  private userService = inject(UserService);
  private eventService = inject(EventService);
  private messagingService = inject(MessagingService);
  private breadcrumbService = inject(BreadcrumbService);
  private activityService = inject(ActivityService);

  communityCode = signal<string | null>(null);
  community = signal<CommunityDTO | null>(null);
  members = signal<CommunityMembershipDTO[]>([]);
  pendingRequests = signal<CommunityMembershipDTO[]>([]);
  pendingInvitations = signal<CommunityMembershipDTO[]>([]);
  myMembership = signal<CommunityMembershipDTO | null>(null);
  groups = signal<GroupDTO[]>([]);
  events = signal<EventDTO[]>([]);

  isLoading = signal(false);
  membersLoading = signal(false);
  groupsLoading = signal(false);
  eventsLoading = signal(false);
  error = signal<string | null>(null);

  activeTab = 'updates';
  showCreateGroupModal = signal(false);
  showCreateEventModal = signal(false);
  showInviteModal = signal(false);
  showMembersModal = signal(false);

  eventFilter = signal<'ongoing' | 'upcoming' | 'past'>('ongoing');
  groupFilter = signal<'my' | 'all'>('my');
  eventSearch = signal('');
  groupSearch = signal('');

  currentUserId = signal<string | null>(null);

  acceptedMemberCount = computed(() => {
    const m = this.members();
    const c = this.community();
    if (m.length > 0) return m.length;
    return c?.memberCount || 0;
  });

  acceptedMembers = computed(() => this.members().filter(m => m.status === 'ACCEPTED'));

  filteredEvents = computed(() => {
    let list = this.events();
    const filter = this.eventFilter();
    const search = this.eventSearch().toLowerCase();
    const now = new Date();

    if (search) {
      list = list.filter(e => e.title.toLowerCase().includes(search) || (e.location && e.location.toLowerCase().includes(search)));
    }

    if (filter === 'ongoing') {
      return list.filter(e => new Date(e.eventDate).toDateString() === now.toDateString());
    } else if (filter === 'upcoming') {
      return list.filter(e => new Date(e.eventDate) > now);
    } else {
      return list.filter(e => new Date(e.eventDate) < now);
    }
  });

  filteredGroups = computed(() => {
    let list = this.groups();
    const filter = this.groupFilter();
    const search = this.groupSearch().toLowerCase();

    if (search) {
      list = list.filter(g => g.name.toLowerCase().includes(search) || (g.description && g.description.toLowerCase().includes(search)));
    }

    if (filter === 'my') {
      // For now we don't have membership info for groups in this view, so we show all if filter is 'my'
      // Ideally we'd filter by current user membership.
      return list; 
    }
    return list;
  });

  ngOnInit() {
    this.userService.getUserCode().subscribe(code => this.currentUserId.set(code));
    this.route.paramMap.subscribe(params => {
      const code = params.get('id');
      this.communityCode.set(code);
      if (code) {
        this.loadCommunity(code);
      }
    });
  }

  loadCommunity(code: string) {
    this.isLoading.set(true);
    this.error.set(null);

    this.communityService.getCommunityByCode(code).subscribe({
      next: (community) => {
        this.community.set(community);
        this.isLoading.set(false);
        this.loadMyMembership(code);
        this.loadGroups(code);
        this.loadEvents(code);
        this.loadMembers(code); // Always load members to have accurate counts and pending requests

        this.breadcrumbService.setBreadcrumbs([
          { label: 'Borough', url: '/app/communities' },
          { label: community.name, url: `/app/communities/${community.communityCode}` },
        ]);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load community');
        this.isLoading.set(false);
      },
    });
  }


  loadGroups(code: string) {
    this.groupsLoading.set(true);
    this.groupService.getGroupsByCommunity(code).subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.groupsLoading.set(false);
      },
      error: (err) => {
        this.groupsLoading.set(false);
      }
    });
  }

  loadEvents(code: string) {
    this.eventsLoading.set(true);
    this.eventService.getEventsByCommunity(code).subscribe({
      next: (events) => {
        this.events.set(events);
        this.eventsLoading.set(false);
        
        // Logic: default is Ongoing Events and if it is 0, the default goes to upcoming events
        const now = new Date();
        const ongoing = events.filter(e => new Date(e.eventDate).toDateString() === now.toDateString());
        if (ongoing.length === 0) {
          const upcoming = events.filter(e => new Date(e.eventDate) > now);
          if (upcoming.length > 0) {
            this.eventFilter.set('upcoming');
          }
        }
      },
      error: (err) => {
        this.eventsLoading.set(false);
      }
    });
  }

  loadMembers(code: string) {
    this.membersLoading.set(true);
    this.communityService.getMembers(code).subscribe({
      next: (members) => {
        this.members.set(members.filter(m => m.status === 'ACCEPTED'));
        this.pendingRequests.set(members.filter(m => m.status === 'PENDING_APPROVAL'));
        this.pendingInvitations.set(members.filter(m => m.status === 'PENDING_INVITATION'));
        this.membersLoading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load members');
        this.membersLoading.set(false);
      },
    });
  }

  cancelInvitation(invitation: CommunityMembershipDTO) {
    const code = this.communityCode();
    if (!code) return;
    this.communityService.removeMember(code, invitation.user.userCode).subscribe({
      next: () => this.loadMembers(code),
      error: (err: any) => alert(err.message || 'Failed to cancel invitation')
    });
  }

  loadPendingRequests(code: string) {
    // Relying on loadMembers for both now, but keeping this for tab direct access
    this.loadMembers(code);
  }

  loadMyMembership(code: string) {
    this.userService.getUserCode().subscribe({
      next: (userCode) => {
        this.communityService.getUserMembership(code, userCode).subscribe({
          next: (membership) => this.myMembership.set(membership),
          error: () => this.myMembership.set(null),
        });
      },
      error: () => this.myMembership.set(null)
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    const code = this.communityCode();
    if (!code) return;

    if (tab === 'members') this.loadMembers(code);
    if (tab === 'requests') this.loadPendingRequests(code);
    if (tab === 'groups') this.loadGroups(code);
    if (tab === 'updates') this.loadEvents(code); // Updates tab also needs events for count maybe? 
  }

  openMembersModal() {
    const code = this.communityCode();
    if (code) {
      this.loadMembers(code);
      this.showMembersModal.set(true);
    }
  }

  requestJoin() {
    const code = this.communityCode();
    if (!code) return;

    this.communityService.requestToJoin(code).subscribe({
      next: (membership) => {
        this.myMembership.set(membership);
      },
      error: (err) => this.error.set(err.message || 'Failed to request join'),
    });
  }

  acceptInvitation() {
    const code = this.communityCode();
    if (!code) return;

    this.communityService.acceptInvitation(code).subscribe({
      next: (membership) => {
        this.myMembership.set(membership);
        const c = this.community();
        if (c) this.community.set({ ...c, memberCount: c.memberCount + 1 });
        this.messagingService.recordActivity(`${membership.user.name || 'A user'} has joined the community`, { communityCode: code }).subscribe();
        this.activityService.triggerRefresh();
      },
      error: (err) => this.error.set(err.message || 'Failed to accept invitation'),
    });
  }

  approveRequest(request: CommunityMembershipDTO) {
    const code = this.communityCode();
    if (!code) return;

    this.communityService.approveRequest(code, request.user.userCode).subscribe({
      next: () => {
        this.pendingRequests.update(list => list.filter(r => r.id !== request.id));
        const c = this.community();
        if (c) this.community.set({ ...c, memberCount: c.memberCount + 1 });
        if (this.activeTab === 'members') this.loadMembers(code);
        this.messagingService.recordActivity(`${request.user.name || 'A user'} has joined the community`, { communityCode: code }).subscribe();
        this.activityService.triggerRefresh();
      },
      error: (err: any) => this.error.set(err.message || 'Failed to approve request')
    });
  }

  rejectRequest(request: CommunityMembershipDTO) {
    const code = this.communityCode();
    if (!code) return;

    this.communityService.rejectRequest(code, request.user.userCode).subscribe({
      next: () => {
        this.pendingRequests.update(list => list.filter(r => r.id !== request.id));
      },
      error: (err: any) => this.error.set(err.message || 'Failed to reject request')
    });
  }

  onInvite(userCode: string) {
    const code = this.communityCode();
    if (!code) return;

    this.communityService.inviteMember(code, { userCode, role: 'MEMBER' }).subscribe({
      next: () => {
        this.showInviteModal.set(false);
        // Refresh members if we are on that tab
        if (this.activeTab === 'members') this.loadMembers(code);
      },
      error: (err: any) => alert(err.message || 'Failed to send invitation')
    });
  }

  leaveCommunity() {
    const code = this.communityCode();
    const membership = this.myMembership();
    if (!code || !membership) return;

    if (membership.role === 'OWNER') {
      alert('Owner cannot leave until ownership is transferred.');
      return;
    }

    this.communityService.removeMember(code, membership.user.userCode).subscribe({
      next: () => {
        this.messagingService.recordActivity(`${membership.user.name || 'A user'} has left the community`, { communityCode: code }).subscribe();
        this.myMembership.set(null);
        const c = this.community();
        if (c) this.community.set({ ...c, memberCount: Math.max(0, c.memberCount - 1) });
        this.members.update(list => list.filter(m => m.user.userCode !== membership.user.userCode));
      },
      error: (err: any) => this.error.set(err.message || 'Failed to leave community'),
    });
  }

  updateMemberRole(member: CommunityMembershipDTO, role: MemberRole) {
    const code = this.communityCode();
    if (!code) return;

    if (role === 'OWNER') {
      if (!confirm('Transfer ownership? You will become an ADMIN.')) return;
    }

    this.communityService.updateMemberRole(code, member.user.userCode, role).subscribe({
      next: () => {
        this.messagingService.recordActivity(`${member.user.name || 'A user'}'s role was updated to ${role}`, { communityCode: code }).subscribe();
        this.loadMembers(code);
        this.loadMyMembership(code);
      },
      error: (err: any) => this.error.set(err.message || 'Failed to update role'),
    });
  }

  removeMember(member: CommunityMembershipDTO) {
    const code = this.communityCode();
    if (!code) return;
    if (member.role === 'OWNER') return;

    this.communityService.removeMember(code, member.user.userCode).subscribe({
      next: () => {
        this.messagingService.recordActivity(`${member.user.name || 'A user'} was removed from the community`, { communityCode: code }).subscribe();
        this.members.update(list => list.filter(m => m.user.userCode !== member.user.userCode));
        const c = this.community();
        if (c) this.community.set({ ...c, memberCount: Math.max(0, c.memberCount - 1) });
      },
      error: (err: any) => this.error.set(err.message || 'Failed to remove member'),
    });
  }

  approveMembership(member: CommunityMembershipDTO) {
    this.approveRequest(member);
  }

  rejectMembership(member: CommunityMembershipDTO) {
    this.rejectRequest(member);
  }

  deleteCommunity() {
    const code = this.communityCode();
    if (!code || !confirm('Delete this community?')) return;
    this.communityService.deleteCommunity(code).subscribe({
      next: () => this.router.navigate(['/app/communities']),
      error: (err) => this.error.set(err.message || 'Failed to delete community'),
    });
  }

  deleteGroup(group: GroupDTO) {
    if (!confirm(`Delete group "${group.name}"?`)) return;
    this.groupService.deleteGroup(group.groupCode).subscribe({
      next: () => {
        const code = this.communityCode();
        if (code) {
          this.messagingService.recordActivity(`Group "${group.name}" was deleted`, { communityCode: code }).subscribe();
        }
        this.groups.update(list => list.filter(g => g.groupCode !== group.groupCode));
        const c = this.community();
        if (c) this.community.set({ ...c, groupCount: Math.max(0, c.groupCount - 1) });
      },
      error: (err) => alert(err.message || 'Failed to delete group')
    });
  }

  deleteEvent(event: EventDTO) {
    if (!confirm(`Delete event "${event.title}"?`)) return;
    this.eventService.deleteEvent(event.eventCode).subscribe({
      next: () => {
        this.events.update(list => list.filter(e => e.eventCode !== event.eventCode));
      },
      error: (err) => alert(err.message || 'Failed to delete event')
    });
  }

  onGroupCreated(group: GroupDTO) {
    this.groups.update(list => [group, ...list]);
    this.showCreateGroupModal.set(false);
    const c = this.community();
    if (c) this.community.set({ ...c, groupCount: c.groupCount + 1 });
    this.activityService.triggerRefresh();
    
    // Navigate to the newly created group
    this.router.navigate(['/app/groups', group.groupCode]);
  }

  onEventCreated(event: EventDTO) {
    this.events.update(list => [event, ...list]);
    this.showCreateEventModal.set(false);
    this.activityService.triggerRefresh();
  }

  toggleChatRestriction(restricted: boolean) {
    const code = this.communityCode();
    if (!code) return;
    
    this.communityService.updateCommunity(code, { onlyAdminsCanChat: restricted } as any).subscribe({
      next: (updated) => this.community.set(updated),
      error: (err) => alert(err.message || 'Failed to update settings')
    });
  }

  get myRole(): MemberRole | null {
    const m = this.myMembership();
    return (m && m.status === 'ACCEPTED') ? m.role : null;
  }

  get isOwnerOrAdmin(): boolean {
    return this.myRole === 'OWNER' || this.myRole === 'ADMIN';
  }

  get isAcceptedMember(): boolean {
    return this.myMembership()?.status === 'ACCEPTED';
  }

  get isPendingMember(): boolean {
    return this.myMembership()?.status === 'PENDING_APPROVAL';
  }

  get canChatInNotices(): boolean {
    const c = this.community();
    if (!c) return false;
    if (!this.isAcceptedMember) return false;
    if (c.onlyAdminsCanChat) {
      return this.isOwnerOrAdmin;
    }
    return true;
  }
}
