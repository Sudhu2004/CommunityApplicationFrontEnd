import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventAttendanceDTO, AttendanceStatus } from '../../models/event';

@Component({
  selector: 'app-attendance-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-modal.html',
  styleUrl: './attendance-modal.css'
})
export class AttendanceModal {
  @Input() attendance: any[] = []; // Combined members and attendance
  @Input() isManageMode = false;
  @Input() eventTitle = '';

  @Output() markAttendance = new EventEmitter<{ userCode: string, status: AttendanceStatus }>();
  @Output() closed = new EventEmitter<void>();

  searchTerm = signal('');

  filteredAttendance = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.attendance;
    return this.attendance.filter(a => 
      (a.user.name || a.user.email).toLowerCase().includes(term) || 
      a.user.email.toLowerCase().includes(term)
    );
  });

  onSearch(value: string) {
    this.searchTerm.set(value);
  }

  toggleAttendance(member: any) {
    if (!this.isManageMode) return;
    const nextStatus: AttendanceStatus = member.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    this.markAttendance.emit({ userCode: member.user.userCode, status: nextStatus });
  }

  close() {
    this.closed.emit();
  }
}
