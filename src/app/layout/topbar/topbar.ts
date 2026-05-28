import { Component, EventEmitter, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbService } from '../../core/services/breadcrumb';
import { ActivityService, Activity } from '../../core/services/activity';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class Topbar implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  private breadcrumbService = inject(BreadcrumbService);
  private activityService = inject(ActivityService);

  breadcrumbs = this.breadcrumbService.breadcrumbs;
  activities = signal<Activity[]>([]);
  showNotifications = signal(false);

  ngOnInit() {
    this.loadActivities();
    this.activityService.onRefresh.subscribe(() => this.loadActivities());
  }

  loadActivities() {
    this.activityService.getActivitiesByType('USER').subscribe({
      next: (data) => this.activities.set(data),
      error: (err) => {}
    });
  }

  onToggle() {
    this.toggleSidebar.emit();
  }

  toggleNotifications() {
    this.showNotifications.update(v => !v);
    if (this.showNotifications()) {
      this.loadActivities();
    }
  }
}
