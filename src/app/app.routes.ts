import { Routes } from '@angular/router';
import { AppShell } from './layout/app-shell/app-shell';
import { LandingPage } from './domains/landing/components/landing-page/landing-page';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // Root path: Landing page for guests, redirect to app for members
  {
    path: '',
    component: LandingPage,
    canActivate: [guestGuard]
  },

  // Auth Routes (Public/Guest only)
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./domains/auth/components/login/login').then(m => m.Login) },
      { path: 'register', loadComponent: () => import('./domains/auth/components/register/register').then(m => m.Register) },
      { path: 'activation', loadComponent: () => import('./domains/auth/components/activation/activation').then(m => m.Activation) }
    ]
  },

  // Protected App Routes (Members only)
  {
    path: 'app',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'communities', pathMatch: 'full' },

      // Communities
      { path: 'communities', loadComponent: () => import('./domains/community/components/community-list/community-list').then(m => m.CommunityList) },
      { path: 'communities/:id', loadComponent: () => import('./domains/community/components/community-detail/community-detail').then(m => m.CommunityDetail) },

      // Groups
      { path: 'groups/:id', loadComponent: () => import('./domains/group/components/group-detail/group-detail').then(m => m.GroupDetail) },

      // Events
      { path: 'events/:id', loadComponent: () => import('./domains/event/components/event-detail/event-detail').then(m => m.EventDetail) },

      // User Profile - :id is the userCode
      { path: 'user/:id', loadComponent: () => import('./domains/profile/components/profile-page/profile-page').then(m => m.ProfilePage) }
    ]
  },

  // Fallback
  { path: '**', redirectTo: '' }
];