import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../services/group';
import { MessagingService } from '../../../messaging/services/messaging';
import { GroupDTO } from '../../models/group';

@Component({
  selector: 'app-create-group-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-group-modal.html',
  styleUrl: './create-group-modal.css',
})
export class CreateGroupModal {
  @Input({ required: true }) communityCode!: string;
  @Output() created = new EventEmitter<GroupDTO>();
  @Output() closed = new EventEmitter<void>();

  private groupService = inject(GroupService);
  private messagingService = inject(MessagingService);

  name = '';
  description = '';
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  get isValid(): boolean {
    return this.name.trim().length >= 2 && this.name.trim().length <= 255;
  }

  submit() {
    if (!this.isValid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    this.groupService
      .createGroup({
        communityCode: this.communityCode,
        name: this.name.trim(),
        description: this.description.trim() || undefined,
      })
      .subscribe({
        next: (group) => {
          this.messagingService.recordActivity(`New group "${group.name}" was created`, { communityCode: this.communityCode }).subscribe();
          this.isSubmitting.set(false);
          this.created.emit(group);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.error.set(err.message || 'Failed to create group');
        },
      });
  }

  close() {
    if (!this.isSubmitting()) {
      this.closed.emit();
    }
  }
}
