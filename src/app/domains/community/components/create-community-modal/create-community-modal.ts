import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunityService } from '../../services/community';
import { CommunityDTO } from '../../models/community';

@Component({
  selector: 'app-create-community-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-community-modal.html',
  styleUrl: './create-community-modal.css',
})
export class CreateCommunityModal {
  @Output() created = new EventEmitter<CommunityDTO>();
  @Output() closed = new EventEmitter<void>();

  private communityService = inject(CommunityService);

  name = '';
  description = '';
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  // Validation
  get nameError(): string | null {
    if (this.name.length === 0) return null; // pristine
    if (this.name.length < 2) return 'Name must be at least 2 characters.';
    if (this.name.length > 255) return 'Name must be 255 characters or fewer.';
    return null;
  }

  get descError(): string | null {
    if (this.description.length > 1000) return 'Description must be 1000 characters or fewer.';
    return null;
  }

  get isValid(): boolean {
    return (
      this.name.length >= 2 &&
      this.name.length <= 255 &&
      this.description.length <= 1000
    );
  }

  submit() {
    if (!this.isValid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    this.communityService
      .createCommunity({
        name: this.name.trim(),
        description: this.description.trim() || undefined,
      })
      .subscribe({
        next: (community) => {
          this.isSubmitting.set(false);
          this.created.emit(community);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.error.set(err.message || 'Failed to create community');
        },
      });
  }

  close() {
    if (!this.isSubmitting()) {
      this.closed.emit();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }
}
