import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../../core/services/auth';
import { UserService, User } from '../../../../core/services/user';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetail implements OnInit {
  private authService = inject(Auth);
  private userService = inject(UserService);

  currentUser = this.authService.currentUser;
  users = signal<User[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAllUsers();
  }

  /**
   * Load all users from the backend
   * Based on Python test: test_get_all_users
   */
  private loadAllUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.error.set(error.error?.message || 'Failed to load users');
        this.isLoading.set(false);
        console.error('Error loading users:', error);
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
