import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TeamDetailComponent } from './dashboard/team-detail.component';
import { ProfileComponent } from './profile/profile.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'team/:id', component: TeamDetailComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'profile/:userId', component: ProfileComponent },
  { path: '**', redirectTo: '/login' }
];
