import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User } from '../../../core/services/user';

@Component({
  selector: 'app-invite-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invite-modal.html',
  styleUrl: './invite-modal.css'
})
export class InviteModal {
  @Input() title = 'Invite Member';
  @Input() description = 'Search for a member to invite.';
  @Input() usersList: User[] | null = null;
  
  @Output() invited = new EventEmitter<string>(); 
  @Output() closed = new EventEmitter<void>();

  private userService = inject(UserService);

  searchTerm = '';
  users = signal<User[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  onSearch() {
    if (this.searchTerm.trim().length < 2) {
      this.users.set([]);
      return;
    }

    if (this.usersList) {
      const filtered = this.usersList.filter((u: User) => 
        u.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
      this.users.set(filtered);
      return;
    }

    this.isLoading.set(true);
    this.userService.getAllUsers().subscribe({
      next: (allUsers: User[]) => {
        const filtered = allUsers.filter((u: User) => 
          u.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
          u.email.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
        this.users.set(filtered);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to search users');
        this.isLoading.set(false);
      }
    });
  }

  invite(userCode: string) {
    this.invited.emit(userCode);
  }

  close() {
    this.closed.emit();
  }
}
