import { Component, EventEmitter, input, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MemberRole } from '../../models/community';

@Component({
  selector: 'app-members-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './members-modal.html',
  styleUrl: './members-modal.css'
})
export class MembersModal {
  members = input<any[]>([]);
  requests = input<any[]>([]);
  invitations = input<any[]>([]);
  canManage = input(false);
  currentUserId = input<string | null>(null);
  currentUserRole = input<MemberRole | null>(null);

  @Output() updateRole = new EventEmitter<{ member: any, role: MemberRole }>();
  @Output() removeMember = new EventEmitter<any>();
  @Output() approveRequest = new EventEmitter<any>();
  @Output() rejectRequest = new EventEmitter<any>();
  @Output() cancelInvitation = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  private router = inject(Router);
  searchTerm = signal('');
  viewMode = signal<'members' | 'requests' | 'invitations'>('members');

  filteredMembers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const list = this.members();
    if (!term) return list;
    return list.filter(m => 
      (m.user?.name || m.user?.email || '').toLowerCase().includes(term) || 
      (m.user?.email || '').toLowerCase().includes(term)
    );
  });

  filteredRequests = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const list = this.requests();
    if (!term) return list;
    return list.filter(r => 
      (r.user?.name || r.user?.email || '').toLowerCase().includes(term) || 
      (r.user?.email || '').toLowerCase().includes(term)
    );
  });

  filteredInvitations = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const list = this.invitations();
    if (!term) return list;
    return list.filter(i => 
      (i.user?.name || i.user?.email || '').toLowerCase().includes(term) || 
      (i.user?.email || '').toLowerCase().includes(term)
    );
  });

  setViewMode(mode: 'members' | 'requests' | 'invitations') {
    this.viewMode.set(mode);
  }

  onSearch(value: string) {
    this.searchTerm.set(value);
  }

  close() {
    this.closed.emit();
  }

  goToProfile(userCode: string) {
    window.open(`/app/user/${userCode}`, '_blank');
  }

  promote(member: any) {
    if (member.role === 'MEMBER') {
      this.updateRole.emit({ member, role: 'ADMIN' });
    }
  }

  demote(member: any) {
    if (member.role === 'ADMIN') {
      this.updateRole.emit({ member, role: 'MEMBER' });
    }
  }

  transferOwnership(member: any) {
    if (member.role === 'ADMIN' && confirm('Transfer ownership to this member? You will become an ADMIN.')) {
      this.updateRole.emit({ member, role: 'OWNER' });
    }
  }

  remove(member: any) {
    if (confirm(`Remove ${member.user.name || member.user.email}?`)) {
      this.removeMember.emit(member);
    }
  }

  approve(request: any) {
    this.approveRequest.emit(request);
  }

  reject(request: any) {
    if (confirm(`Reject request from ${request.user.name || request.user.email}?`)) {
      this.rejectRequest.emit(request);
    }
  }

  cancelInvite(invitation: any) {
    if (confirm(`Cancel invitation for ${invitation.user.name || invitation.user.email}?`)) {
      this.cancelInvitation.emit(invitation);
    }
  }
}
