import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event';
import { GroupService } from '../../../group/services/group';
import { CommunityService } from '../../../community/services/community';
import { UserService } from '../../../../core/services/user';
import { EventDTO, EventAttendanceDTO, AttendanceStatsDTO, AttendanceStatus } from '../../models/event';
import { MessageThread } from '../../../messaging/components/message-thread/message-thread';
import { BreadcrumbService } from '../../../../core/services/breadcrumb';
import { AttendanceModal } from '../attendance-modal/attendance-modal';
import { MemberRole } from '../../../community/models/community';
import { MessagingService } from '../../../messaging/services/messaging';
import { ActivityService } from '../../../../core/services/activity';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MessageThread, AttendanceModal],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.css'
})
export class EventDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private eventService = inject(EventService);
  private groupService = inject(GroupService);
  private communityService = inject(CommunityService);
  private userService = inject(UserService);
  private breadcrumbService = inject(BreadcrumbService);
  private messagingService = inject(MessagingService);
  private activityService = inject(ActivityService);

  eventCode = signal<string | null>(null);
  event = signal<EventDTO | null>(null);
  attendance = signal<EventAttendanceDTO[]>([]);
  stats = signal<AttendanceStatsDTO | null>(null);
  myAttendance = signal<EventAttendanceDTO | null>(null);
  groupMembers = signal<any[]>([]); 

  isLoading = signal(false);
  attendanceLoading = signal(false);
  error = signal<string | null>(null);

  activeTab = 'chat';
  myGroupRole = signal<MemberRole | null>(null);
  myCommunityRole = signal<MemberRole | null>(null);
  isAcceptedMember = signal<boolean>(false);
  isGroupMember = signal<boolean>(false);
  isPendingMember = signal<boolean>(false);
  isPendingGroupMember = signal<boolean>(false);

  canViewContent = computed(() => {
    const e = this.event();
    if (!e) return false;
    // Must be accepted in community
    if (!this.isAcceptedMember()) return false;
    // If it's a group event, must be accepted in group
    if (e.groupCode && !this.isGroupMember()) return false;
    return true;
  });

  showAttendanceModal = signal(false);
  attendanceManageMode = signal(false);
  
  messagesList = signal<any[]>([]);
  links = computed(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return this.messagesList()
      .filter(m => m.content && m.content.match(urlRegex))
      .map(m => ({
        content: m.content,
        url: m.content.match(urlRegex)![0],
        sender: m.sender.name || m.sender.email,
        date: m.createdAt
      }));
  });

  media = signal<any[]>([
    { type: 'image', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=400', date: new Date() },
    { type: 'image', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=400', date: new Date(Date.now() - 86400000) },
    { type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', date: new Date(Date.now() - 172800000) },
  ]);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const code = params.get('id');
      this.eventCode.set(code);
      if (code) {
        this.loadEvent(code);
      }
    });
  }

  loadEvent(code: string) {
    this.isLoading.set(true);
    this.error.set(null);

    this.eventService.getEventByCode(code).subscribe({
      next: (event) => {
        this.event.set(event);
        this.isLoading.set(false);
        this.loadMyAttendance(code);
        this.loadRoles(event);

        const breadcrumbs = [
          { label: 'Tribe', url: '/app/communities' },
          { label: event.communityName || 'Community', url: `/app/communities/${event.communityCode}` }
        ];
        if (event.groupCode) {
          breadcrumbs.push({ label: event.groupName || 'Group', url: `/app/groups/${event.groupCode}` });
        }
        breadcrumbs.push({ label: event.title, url: `/app/events/${code}` });
        this.breadcrumbService.setBreadcrumbs(breadcrumbs);
        this.loadMessages(code);
        
        if (event.attendanceEnabled) {
          this.loadStats(code);
          if (event.groupCode) {
            this.loadGroupMembers(event.groupCode);
          }
        }
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load event');
        this.isLoading.set(false);
      }
    });
  }

  loadRoles(event: EventDTO) {
    this.userService.getUserCode().subscribe(userCode => {
      this.communityService.getUserMembership(event.communityCode, userCode).subscribe({
        next: (m) => {
          this.myCommunityRole.set(m.role);
          this.isAcceptedMember.set(m.status === 'ACCEPTED');
          this.isPendingMember.set(m.status === 'PENDING_APPROVAL');
        },
        error: () => {
          this.myCommunityRole.set(null);
          this.isAcceptedMember.set(false);
          this.isPendingMember.set(false);
        }
      });
      if (event.groupCode) {
        this.groupService.getUserMembership(event.groupCode, userCode).subscribe({
          next: (m) => {
            this.myGroupRole.set(m.role);
            this.isGroupMember.set(m.status === 'ACCEPTED');
            this.isPendingGroupMember.set(m.status === 'PENDING_APPROVAL');
          },
          error: () => {
            this.myGroupRole.set(null);
            this.isGroupMember.set(false);
            this.isPendingGroupMember.set(false);
          }
        });
      }
    });
  }

  loadGroupMembers(groupCode: string) {
    this.groupService.getMembers(groupCode).subscribe({
      next: (members) => {
        this.groupMembers.set(members.filter(m => m.status === 'ACCEPTED'));
      },
      error: (err) => console.error('Failed to load group members:', err)
    });
  }

  loadAttendance(code: string) {
    this.attendanceLoading.set(true);
    this.eventService.getEventAttendance(code).subscribe({
      next: (data) => {
        this.attendance.set(data);
        this.attendanceLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load attendance:', err);
        this.attendanceLoading.set(false);
      }
    });
  }

  loadStats(code: string) {
    this.eventService.getAttendanceStats(code).subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => console.error('Failed to load stats:', err)
    });
  }

  loadMyAttendance(code: string) {
    this.userService.getUserCode().subscribe({
      next: (userCode) => {
        this.eventService.getEventAttendance(code).subscribe({
          next: (list) => {
            const mine = list.find(a => a.user.userCode === userCode);
            this.myAttendance.set(mine || null);
          }
        });
      }
    });
  }

  loadMessages(code: string) {
    this.messagingService.getMessagesByEvent(code).subscribe({
      next: (page) => this.messagesList.set(page.content),
      error: (err) => console.error('Failed to load messages:', err)
    });
  }

  openAttendanceModal(manage: boolean) {
    if (manage && !this.canTakeAttendance) {
      if (!this.isOwnerOrAdmin) alert('Only admins can take attendance.');
      else alert('Attendance can only be taken once the event has started.');
      return;
    }
    this.attendanceManageMode.set(manage);
    const code = this.eventCode();
    if (code) {
      this.loadAttendance(code);
      this.showAttendanceModal.set(true);
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
    const code = this.eventCode();
    if (tab === 'attendance' && code) {
      this.loadAttendance(code);
    }
    if (tab === 'links' && code) {
      this.loadMessages(code);
    }
  }

  markMyAttendance(status: AttendanceStatus) {
    const code = this.eventCode();
    const event = this.event();
    if (!code || !event) return;

    this.userService.getUserCode().subscribe({
      next: (userCode) => {
        this.eventService.markAttendance(code, { 
          userCode, 
          groupCode: event.groupCode || event.communityCode, 
          status,
          type: 'EVENTS'
        }).subscribe({
          next: (attendance) => {
            this.myAttendance.set(attendance);
            this.loadStats(code);
            if (this.activeTab === 'attendance') this.loadAttendance(code);
            this.activityService.triggerRefresh();
          },
          error: (err) => this.error.set(err.message || 'Failed to mark attendance')
        });
      }
    });
  }

  markUserAttendance(userCode: string, status: AttendanceStatus) {
    const code = this.eventCode();
    const event = this.event();
    if (!code || !event) return;

    this.eventService.markAttendance(code, {
      userCode,
      groupCode: event.groupCode || event.communityCode,
      status,
      type: 'EVENTS'
    }).subscribe({
      next: () => {
        this.loadStats(code);
        this.loadAttendance(code);
        this.activityService.triggerRefresh();
      },
      error: (err) => alert(err.message || 'Failed to mark attendance')
    });
  }

  get combinedAttendance(): any[] {
    const records = this.attendance();
    const members = this.groupMembers();
    
    if (members.length === 0) return records;
    
    return members.map(m => {
      const record = records.find(r => r.user.userCode === m.user.userCode);
      if (record) return record;
      return {
        user: m.user,
        status: 'PENDING',
        isPlaceholder: true
      };
    });
  }

  get canTakeAttendance(): boolean {
    if (!this.isOwnerOrAdmin) return false;
    const event = this.event();
    if (!event) return false;
    const now = new Date();
    return new Date(event.eventDate) <= now;
  }

  get isOwnerOrAdmin(): boolean {
    const gRole = this.myGroupRole();
    const cRole = this.myCommunityRole();
    return gRole === 'OWNER' || gRole === 'ADMIN' || cRole === 'OWNER' || cRole === 'ADMIN';
  }

  get canChat(): boolean {
    return true;
  }
}
