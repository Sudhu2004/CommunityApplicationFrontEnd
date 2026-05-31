import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UserService } from '../../../../core/services/user';
import { BreadcrumbService } from '../../../../core/services/breadcrumb';
import { CommunityService } from '../../../community/services/community';
import { ActivityService, Activity } from '../../../../core/services/activity';
import { UserProfile } from '../../models/profile';
import { CommunityDTO } from '../../../community/models/community';
import { Observable, of } from 'rxjs';
import { CommunityCard } from '../../../community/components/community-card/community-card';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterModule, CommunityCard],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css'
})
export class ProfilePage implements OnInit {
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private breadcrumbService = inject(BreadcrumbService);
  private communityService = inject(CommunityService);
  private activityService = inject(ActivityService);

  public profile = signal<UserProfile | null>(null);
  public isOwnProfile = false;
  public userCommunities = signal<CommunityDTO[]>([]);
  public activities = signal<Activity[]>([]);
  public eventCount = signal<number>(0);
  public recentEvents = signal<any[]>([]);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const userCodeFromRoute = params.get('id');
      if (userCodeFromRoute) {
        this.loadProfile(userCodeFromRoute);
      }
    });
  }

  loadProfile(userCode: string) {
    this.userService.getUserProfileByCode(userCode).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.breadcrumbService.setBreadcrumbs([
          { label: 'Borough', url: '/app/communities' },
          { label: profile.name, url: `/app/user/${userCode}` }
        ]);

        this.userService.getUserCode().subscribe(currentCode => {
          this.isOwnProfile = (currentCode === userCode);
          if (this.isOwnProfile) {
            this.loadActivities();
          }
        });

        this.loadCommunities(userCode);
      }
    });
  }

  loadCommunities(userCode: string) {
    this.communityService.getUserCommunities(userCode).subscribe({
      next: (communities) => {
        this.userCommunities.set(communities);
        // Update community count based on what we actually got
        const p = this.profile();
        if (p) {
          this.profile.set({ ...p, communityCount: communities.length });
        }
      }
    });
  }

  loadActivities() {
    this.activityService.getActivitiesByType('USER').subscribe({
      next: (activities) => {
        this.activities.set(activities);
        // Set event count based on activities or another source if available
        // For now, let's use a placeholder or 0 instead of 12
        this.eventCount.set(activities.filter(a => a.type === 'EVENTS').length);
      }
    });
  }
}
