import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../services/group';
import { CommunityService } from '../../../community/services/community';
import { EventService } from '../../../event/services/event';
import { UserService, User } from '../../../../core/services/user';
import { GroupDTO, GroupMembershipDTO } from '../../models/group';
import { EventDTO } from '../../../event/models/event';
import { MemberRole } from '../../../community/models/community';
import { EventCard } from '../../../event/components/event-card/event-card';
import { CreateEventModal } from '../../../event/components/create-event-modal/create-event-modal';
import { MessagingService } from '../../../messaging/services/messaging';
import { BreadcrumbService } from '../../../../core/services/breadcrumb';
import { ActivityService } from '../../../../core/services/activity';
import { InviteModal } from '../../../../shared/components/invite-modal/invite-modal';
import { MembersModal } from '../../../community/components/members-modal/members-modal';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, EventCard, CreateEventModal, InviteModal, MembersModal],
  templateUrl: './group-detail.html',
  styleUrl: './group-detail.css'
})
export class GroupDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private groupService = inject(GroupService);
  private communityService = inject(CommunityService);
  private eventService = inject(EventService);
  private userService = inject(UserService);
  private messagingService = inject(MessagingService);
  private breadcrumbService = inject(BreadcrumbService);
  private activityService = inject(ActivityService);

  groupCode = signal<string | null>(null);
  group = signal<GroupDTO | null>(null);
  events = signal<EventDTO[]>([]);
  members = signal<GroupMembershipDTO[]>([]);
  pendingRequests = signal<GroupMembershipDTO[]>([]);
  pendingInvitations = signal<GroupMembershipDTO[]>([]);
  myMembership = signal<GroupMembershipDTO | null>(null);
  communityRole = signal<MemberRole | null>(null);
  communityMembers = signal<User[]>([]);

  isLoading = signal(false);
  eventsLoading = signal(false);
  membersLoading = signal(false);
  error = signal<string | null>(null);

  activeTab = 'events';
  showCreateEventModal = signal(false);
  showInviteModal = signal(false);
  showMembersModal = signal(false);

  eventFilter = signal<'ongoing' | 'upcoming' | 'past'>('ongoing');
  eventSearch = signal('');
  currentUserId = signal<string | null>(null);

  acceptedMemberCount = computed(() => {
    const m = this.members();
    const g = this.group();
    // If we have loaded the members list, its length is our source of truth (it's already filtered for ACCEPTED)
    if (m.length > 0) return m.length;
    // Fallback to DTO count
    return g?.memberCount || 0;
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

  ngOnInit() {
    this.userService.getUserCode().subscribe(code => this.currentUserId.set(code));
    this.route.paramMap.subscribe(params => {
      const code = params.get('id');
      this.groupCode.set(code);
      if (code) {
        this.loadGroup(code);
      }
    });
  }

  loadGroup(code: string) {
    this.isLoading.set(true);
    this.error.set(null);

    this.groupService.getGroupByCode(code).subscribe({
      next: (group) => {
        this.group.set(group);
        this.isLoading.set(false);
        this.loadMyMembership(code);
        this.loadCommunityRole(group.communityCode);
        this.loadCommunityMembers(group.communityCode);
        this.loadEvents(code);
        this.loadMembers(code); // Always load members to have accurate counts and pending requests

        this.breadcrumbService.setBreadcrumbs([
          { label: 'Borough', url: '/app/communities' },
          { label: group.communityName || 'Community', url: `/app/communities/${group.communityCode}` },
          { label: group.name, url: `/app/groups/${code}` }
        ]);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load group');
        this.isLoading.set(false);
      }
    });
  }

  loadCommunityMembers(communityCode: string) {
    this.communityService.getMembers(communityCode).subscribe({
      next: (members) => {
        this.communityMembers.set(members.map(m => m.user));
      },
      error: (err: any) => {}
    });
  }

  loadEvents(code: string) {
    this.eventsLoading.set(true);
    this.eventService.getEventsByGroup(code).subscribe({
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
      error: (err: any) => {
        this.eventsLoading.set(false);
      }
    });
  }

  loadMembers(code: string) {
    this.membersLoading.set(true);
    this.groupService.getMembers(code).subscribe({
      next: (members) => {
        this.members.set(members.filter(m => m.status === 'ACCEPTED'));
        this.pendingRequests.set(members.filter(m => m.status === 'PENDING_APPROVAL'));
        this.pendingInvitations.set(members.filter(m => m.status === 'PENDING_INVITATION'));
        this.membersLoading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load members');
        this.membersLoading.set(false);
      }
    });
  }

  cancelInvitation(invitation: GroupMembershipDTO) {
    const code = this.groupCode();
    if (!code) return;
    this.groupService.removeMember(code, invitation.user.userCode).subscribe({
      next: () => this.loadMembers(code),
      error: (err: any) => alert(err.message || 'Failed to cancel invitation')
    });
  }

  loadMyMembership(code: string) {
    this.userService.getUserCode().subscribe({
      next: (userCode) => {
        this.groupService.getUserMembership(code, userCode).subscribe({
          next: (membership) => this.myMembership.set(membership),
          error: () => this.myMembership.set(null)
        });
      },
      error: () => this.myMembership.set(null)
    });
  }

  loadCommunityRole(communityCode: string) {
    this.userService.getUserCode().subscribe({
      next: (userCode) => {
        this.communityService.getUserMembership(communityCode, userCode).subscribe({
          next: (membership) => this.communityRole.set(membership.role),
          error: () => this.communityRole.set(null)
        });
      }
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    const code = this.groupCode();
    if (!code) return;

    if (tab === 'members' || tab === 'requests') {
      this.loadMembers(code);
    }
    if (tab === 'events') this.loadEvents(code);
  }

  openMembersModal() {
    const code = this.groupCode();
    if (code) {
      this.loadMembers(code);
      this.showMembersModal.set(true);
    }
  }

  requestJoin() {
    const code = this.groupCode();
    if (!code) return;

    this.groupService.requestToJoin(code).subscribe({
      next: (membership) => {
        this.myMembership.set(membership);
        this.loadMyMembership(code);
      },
      error: (err: any) => this.error.set(err.message || 'Failed to request join')
    });
  }

  acceptInvitation() {
    const code = this.groupCode();
    if (!code) return;

    this.groupService.acceptInvitation(code).subscribe({
      next: (membership) => {
        this.myMembership.set(membership);
        const g = this.group();
        if (g) this.group.set({ ...g, memberCount: g.memberCount + 1 });
        this.messagingService.recordActivity(`${membership.user.name || 'A user'} has joined the group`, { groupCode: code }).subscribe();
        this.activityService.triggerRefresh();
      },
      error: (err: any) => this.error.set(err.message || 'Failed to accept invitation')
    });
  }

  approveMembership(member: GroupMembershipDTO) {
    const code = this.groupCode();
    if (!code) return;

    this.groupService.approveRequest(code, member.user.userCode).subscribe({
      next: () => {
        this.loadMembers(code);
        const g = this.group();
        if (g) this.group.set({ ...g, memberCount: g.memberCount + 1 });
        this.messagingService.recordActivity(`${member.user.name || 'A user'} has joined the group`, { groupCode: code }).subscribe();
        this.activityService.triggerRefresh();
      },
      error: (err: any) => this.error.set(err.message || 'Failed to approve request')
    });
  }

  rejectMembership(member: GroupMembershipDTO) {
    const code = this.groupCode();
    if (!code) return;

    this.groupService.rejectRequest(code, member.user.userCode).subscribe({
      next: () => {
        this.loadMembers(code);
      },
      error: (err: any) => this.error.set(err.message || 'Failed to reject request')
    });
  }

  onInvite(userCode: string) {
    const code = this.groupCode();
    if (!code) return;

    if (this.isOwnerOrAdmin) {
      this.groupService.addMember(code, { userCode, role: 'MEMBER' }).subscribe({
        next: () => {
          this.showInviteModal.set(false);
          alert('Member added successfully!');
          this.loadMembers(code);
          const g = this.group();
          if (g) this.group.set({ ...g, memberCount: g.memberCount + 1 });
        },
        error: (err: any) => alert(err.message || 'Failed to add member')
      });
    } else {
      this.groupService.inviteMember(code, { userCode, role: 'MEMBER' }).subscribe({
        next: () => {
          this.showInviteModal.set(false);
          alert('Invitation sent!');
        },
        error: (err: any) => alert(err.message || 'Failed to send invitation')
      });
    }
  }

  leaveGroup() {
    const code = this.groupCode();
    const membership = this.myMembership();
    if (!code || !membership) return;

    if (membership.role === 'OWNER') {
      alert('Owner cannot leave until ownership is transferred.');
      return;
    }

    this.groupService.removeMember(code, membership.user.userCode).subscribe({
      next: () => {
        this.messagingService.recordActivity(`${membership.user.name || 'A user'} has left the group`, { groupCode: code }).subscribe();
        this.myMembership.set(null);
        const g = this.group();
        if (g) this.group.set({ ...g, memberCount: Math.max(0, g.memberCount - 1) });
        this.members.update(list => list.filter(m => m.user.userCode !== membership.user.userCode));
      },
      error: (err: any) => this.error.set(err.message || 'Failed to leave group')
    });
  }

  updateMemberRole(member: GroupMembershipDTO, role: MemberRole) {
    const code = this.groupCode();
    if (!code) return;

    if (role === 'OWNER') {
      if (!confirm('Transfer ownership? You will become an ADMIN.')) return;
    }

    this.groupService.updateMemberRole(code, member.user.userCode, role).subscribe({
      next: () => {
        this.messagingService.recordActivity(`${member.user.name || 'A user'}'s role was updated to ${role}`, { groupCode: code }).subscribe();
        this.loadMembers(code);
        this.loadMyMembership(code);
      },
      error: (err: any) => this.error.set(err.message || 'Failed to update role')
    });
  }

  removeMember(member: GroupMembershipDTO) {
    const code = this.groupCode();
    if (!code) return;
    if (member.role === 'OWNER') return;

    this.groupService.removeMember(code, member.user.userCode).subscribe({
      next: () => {
        this.messagingService.recordActivity(`${member.user.name || 'A user'} was removed from the group`, { groupCode: code }).subscribe();
        this.members.update(list => list.filter(m => m.user.userCode !== member.user.userCode));
        const g = this.group();
        if (g) this.group.set({ ...g, memberCount: Math.max(0, g.memberCount - 1) });
      },
      error: (err: any) => this.error.set(err.message || 'Failed to remove member')
    });
  }

  deleteGroup() {
    const code = this.groupCode();
    if (!code || !confirm('Delete this group?')) return;
    this.groupService.deleteGroup(code).subscribe({
      next: () => this.router.navigate(['/app/communities', this.group()?.communityCode]),
      error: (err: any) => this.error.set(err.message || 'Failed to delete group')
    });
  }

  onEventCreated(event: EventDTO) {
    this.events.update(list => [event, ...list]);
    this.showCreateEventModal.set(false);
    const g = this.group();
    if (g) this.group.set({ ...g, eventCount: g.eventCount + 1 });
    this.activityService.triggerRefresh();
  }

  deleteEvent(event: EventDTO) {
    if (!confirm(`Delete event "${event.title}"?`)) return;
    this.eventService.deleteEvent(event.eventCode).subscribe({
      next: () => {
        const code = this.groupCode();
        if (code) {
          this.messagingService.recordActivity(`Event "${event.title}" was deleted`, { groupCode: code }).subscribe();
        }
        this.events.update(list => list.filter(e => e.eventCode !== event.eventCode));
        const g = this.group();
        if (g) this.group.set({ ...g, eventCount: Math.max(0, g.eventCount - 1) });
      },
      error: (err: any) => alert(err.message || 'Failed to delete event')
    });
  }

  get myRole(): MemberRole | null {
    const m = this.myMembership();
    if (m && m.status === 'ACCEPTED') return m.role;
    return null;
  }

  get isOwnerOrAdmin(): boolean {
    const commRole = this.communityRole();
    const isCommAdmin = commRole === 'OWNER' || commRole === 'ADMIN';
    return this.myRole === 'OWNER' || this.myRole === 'ADMIN' || isCommAdmin;
  }

  get isAcceptedMember(): boolean {
    return this.myMembership()?.status === 'ACCEPTED';
  }

  get isPendingMember(): boolean {
    return this.myMembership()?.status === 'PENDING_APPROVAL';
  }

  get canChat(): boolean {
    const g = this.group();
    if (!g) return false;
    if (!this.isAcceptedMember) return false;
    if (g.onlyAdminsCanChat) {
      return this.isOwnerOrAdmin;
    }
    return true;
  }
}
