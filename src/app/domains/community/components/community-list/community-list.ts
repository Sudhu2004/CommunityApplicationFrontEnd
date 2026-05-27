import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommunityCard } from '../community-card/community-card';
import { CreateCommunityModal } from '../create-community-modal/create-community-modal';
import { CommunityService } from '../../services/community';
import { UserService } from '../../../../core/services/user';
import { BreadcrumbService } from '../../../../core/services/breadcrumb';
import { CommunityDTO } from '../../models/community';

@Component({
  selector: 'app-community-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CommunityCard, CreateCommunityModal],
  templateUrl: './community-list.html',
  styleUrl: './community-list.css'
})
export class CommunityList implements OnInit {
  private communityService = inject(CommunityService);
  private userService = inject(UserService);
  private breadcrumbService = inject(BreadcrumbService);

  communities = signal<CommunityDTO[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  showCreateModal = signal(false);
  searchTerm = '';
  activeTab = 'all'; // 'all' | 'mine'

  private search$ = new Subject<string>();

  constructor() {
// ... (omitting constructor for brevity, will use exact match below)
  }

  ngOnInit() {
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Tribe', url: '/app/communities' }
    ]);
    this.loadCommunities();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.searchTerm = '';
    this.loadCommunities();
  }

  onSearchInput(value: string) {
    this.searchTerm = value;
    this.search$.next(value);
  }

  loadCommunities() {
    this.isLoading.set(true);
    this.error.set(null);
    this.loadForTab(this.activeTab).subscribe({
      next: (data) => {
        this.communities.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load communities');
        this.isLoading.set(false);
      }
    });
  }

  private loadForTab(tab: string) {
    if (tab === 'mine') {
      return this.userService.getUserCode().pipe(
        switchMap(userCode => this.communityService.getUserCommunities(userCode))
      );
    }
    return this.communityService.getAllCommunities();
  }

  onCommunityCreated(community: CommunityDTO) {
    this.communities.update(list => [community, ...list]);
    this.showCreateModal.set(false);
  }

  onJoinCommunity(community: CommunityDTO) {
    this.communityService.requestToJoin(community.communityCode).subscribe({
      next: () => {
        alert('Join request sent!');
        this.loadCommunities();
      },
      error: (err: any) => this.error.set(err.message || 'Failed to join community')
    });
  }
}
