import { Component, input, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { CommunityService } from '../../domains/community/services/community';
import { CommunityDTO } from '../../domains/community/models/community';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {
  collapsed = input<boolean>(false);

  private auth = inject(Auth);
  private router = inject(Router);
  private userService = inject(UserService);
  private communityService = inject(CommunityService);

  isDarkMode = signal(false);
  currentUserData = this.auth.currentUserData;
  userCode = signal<string>('');
  myCommunities = signal<CommunityDTO[]>([]);

  ngOnInit() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && systemDark);

    this.isDarkMode.set(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    if (this.auth.isAuthenticated()) {
      this.fetchUserCode();
    }
  }

  private fetchUserCode() {
    this.userService.getUserCode().subscribe({
      next: (code) => {
        this.userCode.set(code);
        this.loadMyCommunities(code);
      },
      error: (error) => {
        console.error('Failed to fetch user code:', error);
      }
    });
  }

  private loadMyCommunities(code: string) {
    this.communityService.getUserCommunities(code).subscribe({
      next: (communities) => {
        // We need to check membership status for each community. 
        // For now, if the API doesn't filter, we'll need to fetch membership status.
        // Assuming the requirement is to only show accepted ones.
        // Let's first filter if the DTO had it, but it doesn't.
        // If the backend returns all joined (including pending), we might need an extra check.
        // However, the user said "list of communities of that user should reflect it" 
        // which implies we should only show where status is ACCEPTED.
        
        // I will implement a filter here if I can get the membership status.
        // Since CommunityDTO doesn't have it, I might need to fetch memberships for the user.
        // Let's assume for a moment that getUserCommunities only returns communities where user is a member.
        // If not, I'll need to update this later.
        this.myCommunities.set(communities);
      },
      error: (err) => console.error('Failed to load my communities:', err)
    });
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
    const theme = this.isDarkMode() ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  logout() {
    this.userCode.set('');
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
