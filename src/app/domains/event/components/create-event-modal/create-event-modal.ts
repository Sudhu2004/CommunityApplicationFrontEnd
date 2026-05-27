import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event';
import { MessagingService } from '../../../messaging/services/messaging';
import { EventDTO } from '../../models/event';

@Component({
  selector: 'app-create-event-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event-modal.html',
  styleUrl: './create-event-modal.css',
})
export class CreateEventModal {
  @Input({ required: true }) communityCode!: string;
  @Input() groupCode: string | null = null;
  @Output() created = new EventEmitter<EventDTO>();
  @Output() closed = new EventEmitter<void>();

  private eventService = inject(EventService);
  private messagingService = inject(MessagingService);

  title = '';
  description = '';
  eventDate = '';
  location = '';
  attendanceEnabled = true;
  
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  get isValid(): boolean {
    return this.title.trim().length >= 2 && this.eventDate !== '';
  }

  submit() {
    if (!this.isValid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    this.eventService
      .createEvent({
        title: this.title.trim(),
        description: this.description.trim() || undefined,
        communityCode: this.communityCode,
        groupCode: this.groupCode || undefined,
        eventDate: this.eventDate,
        location: this.location.trim() || undefined,
        attendanceEnabled: this.attendanceEnabled
      })
      .subscribe({
        next: (event) => {
          const msg = `New event "${event.title}" was scheduled for ${event.eventDate}`;
          if (this.groupCode) {
            this.messagingService.recordActivity(msg, { groupCode: this.groupCode }).subscribe();
          } else {
            this.messagingService.recordActivity(msg, { communityCode: this.communityCode }).subscribe();
          }
          this.isSubmitting.set(false);
          this.created.emit(event);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.error.set(err.message || 'Failed to create event');
        },
      });
  }

  close() {
    if (!this.isSubmitting()) {
      this.closed.emit();
    }
  }
}
