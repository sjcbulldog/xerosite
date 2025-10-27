import { Component, inject, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamsService, TeamInvitation } from './teams.service';
import { UsersService, UserProfile } from '../profile/users.service';

interface CreateTeamForm {
  name: FormControl<string>;
  teamNumber: FormControl<number | null>;
  description: FormControl<string>;
  visibility: FormControl<'public' | 'private'>;
}

@Component({
  selector: 'app-dashboard',
  imports: [TitleCasePipe, DatePipe, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly teamsService = inject(TeamsService);
  protected readonly usersService = inject(UsersService);
  private readonly router = inject(Router);

  protected readonly showCreateTeamDialog = signal(false);
  protected readonly showMyTeams = signal(true);
  protected readonly showAllUsers = signal(true);
  protected readonly showPublicTeams = signal(false);
  protected readonly showPendingTeams = signal(false);
  protected readonly isLoadingTeams = signal(false);
  protected readonly isLoadingPublicTeams = signal(false);
  protected readonly isLoadingPendingTeams = signal(false);
  protected readonly isLoadingUsers = signal(false);
  protected readonly isCreatingTeam = signal(false);
  protected readonly isJoiningTeam = signal(false);
  protected readonly createTeamError = signal<string | null>(null);
  protected readonly showUserMenu = signal(false);
  protected readonly adminTeamIds = signal<Set<string>>(new Set());
  protected readonly allUsers = signal<UserProfile[]>([]);
  
  // Invitation signals
  protected readonly showInvitationNotification = signal(false);
  protected readonly pendingInvitations = signal<TeamInvitation[]>([]);
  protected readonly isLoadingInvitations = signal(false);

  protected readonly createTeamForm = new FormGroup<CreateTeamForm>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)] }),
    teamNumber: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1), Validators.max(30000)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    visibility: new FormControl<'public' | 'private'>('private', { nonNullable: true, validators: [Validators.required] })
  });

  async ngOnInit(): Promise<void> {
    await this.loadTeams();
    if (this.isAdmin()) {
      await this.loadAllUsers();
    }
    await this.checkPendingInvitations();
  }

  protected isAdmin(): boolean {
    return this.authService.currentUser()?.state === 'admin';
  }

  private async loadAllUsers(): Promise<void> {
    this.isLoadingUsers.set(true);
    try {
      const users = await this.usersService.getAllUsers();
      this.allUsers.set(users);
    } catch (error: any) {
    } finally {
      this.isLoadingUsers.set(false);
    }
  }

  private async loadTeams(): Promise<void> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.isLoadingTeams.set(true);
    try {
      await this.teamsService.loadUserTeams(userId);
      
      // Check which teams the user is an admin of
      const adminTeams = new Set<string>();
      for (const team of this.teamsService.userTeams()) {
        const members = await this.teamsService.getTeamMembers(team.id);
        const userMember = members.find(m => m.userId === userId);
        if (userMember?.roles.includes('Administrator')) {
          adminTeams.add(team.id);
        }
      }
      this.adminTeamIds.set(adminTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      this.isLoadingTeams.set(false);
    }
  }

  protected openCreateTeamDialog(): void {
    this.showCreateTeamDialog.set(true);
    this.createTeamForm.reset({ visibility: 'private', teamNumber: null });
    this.createTeamError.set(null);
  }

  protected closeCreateTeamDialog(): void {
    this.showCreateTeamDialog.set(false);
    this.createTeamForm.reset();
    this.createTeamError.set(null);
  }

  protected async onCreateTeam(): Promise<void> {
    if (this.createTeamForm.invalid) return;

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.createTeamError.set('User not authenticated');
      return;
    }

    this.isCreatingTeam.set(true);
    this.createTeamError.set(null);

    try {
      const formValue = this.createTeamForm.getRawValue();
      await this.teamsService.createTeam({
        name: formValue.name,
        teamNumber: formValue.teamNumber!,
        description: formValue.description || undefined,
        visibility: formValue.visibility
      }, userId);

      this.closeCreateTeamDialog();
      await this.loadTeams();
    } catch (error: any) {
      this.createTeamError.set(error.message || 'Failed to create team');
    } finally {
      this.isCreatingTeam.set(false);
    }
  }

  protected async toggleMyTeams(): Promise<void> {
    this.showMyTeams.update(value => !value);
  }

  protected async toggleAllUsers(): Promise<void> {
    this.showAllUsers.update(value => !value);
  }

  protected async togglePublicTeams(): Promise<void> {
    const newState = !this.showPublicTeams();
    this.showPublicTeams.set(newState);

    if (newState && this.teamsService.publicTeams().length === 0) {
      const userId = this.authService.currentUser()?.id;
      if (!userId) return;

      this.isLoadingPublicTeams.set(true);
      try {
        await this.teamsService.loadPublicTeams(userId);
      } catch (error) {
        console.error('Error loading public teams:', error);
      } finally {
        this.isLoadingPublicTeams.set(false);
      }
    }
  }

  protected async togglePendingTeams(): Promise<void> {
    const newState = !this.showPendingTeams();
    this.showPendingTeams.set(newState);

    if (newState) {
      const userId = this.authService.currentUser()?.id;
      if (!userId) return;

      this.isLoadingPendingTeams.set(true);
      try {
        await this.teamsService.loadPendingTeams(userId);
      } catch (error) {
        console.error('Error loading pending teams:', error);
      } finally {
        this.isLoadingPendingTeams.set(false);
      }
    }
  }

  protected async joinTeam(teamId: string): Promise<void> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.isJoiningTeam.set(true);
    try {
      await this.teamsService.requestToJoinTeam(teamId);
      // Reload all team lists
      await this.loadTeams();
      await this.teamsService.loadPublicTeams(userId);
      await this.teamsService.loadPendingTeams(userId);
    } catch (error: any) {
      alert(error.message || 'Failed to request to join team');
    } finally {
      this.isJoiningTeam.set(false);
    }
  }

  protected getFieldError(fieldName: string): string | null {
    const field = this.createTeamForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'This field is required';
      }
      if (field.errors['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      }
      if (field.errors['maxlength']) {
        return `Maximum ${field.errors['maxlength'].requiredLength} characters allowed`;
      }
      if (field.errors['min']) {
        return `Minimum value is ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `Maximum value is ${field.errors['max'].max}`;
      }
    }
    return null;
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  protected toggleUserMenu(): void {
    this.showUserMenu.update(value => !value);
  }

  protected navigateToProfile(): void {
    this.showUserMenu.set(false);
    this.router.navigate(['/profile']);
  }

  protected viewTeam(teamId: string): void {
    this.router.navigate(['/team', teamId]);
  }

  protected viewUserProfile(userId: string): void {
    this.router.navigate(['/profile', userId]);
  }

  protected isTeamAdmin(teamId: string): boolean {
    return this.adminTeamIds().has(teamId);
  }

  // Invitation Methods
  protected async checkPendingInvitations(): Promise<void> {
    this.isLoadingInvitations.set(true);
    try {
      const invitations = await this.teamsService.getUserInvitations();
      if (invitations.length > 0) {
        this.pendingInvitations.set(invitations);
        this.showInvitationNotification.set(true);
      }
    } catch (error: any) {
      console.error('Failed to load invitations:', error);
    } finally {
      this.isLoadingInvitations.set(false);
    }
  }

  protected closeInvitationNotification(): void {
    this.showInvitationNotification.set(false);
  }

  protected async acceptInvitation(invitationId: string): Promise<void> {
    try {
      await this.teamsService.acceptInvitation(invitationId);
      
      // Remove the accepted invitation from the list
      const remaining = this.pendingInvitations().filter(inv => inv.id !== invitationId);
      this.pendingInvitations.set(remaining);
      
      // Close notification if no more invitations
      if (remaining.length === 0) {
        this.showInvitationNotification.set(false);
      }
      
      // Reload teams to show the new membership request
      await this.loadTeams();
      
      const userId = this.authService.currentUser()?.id;
      if (userId) {
        await this.teamsService.loadPendingTeams(userId);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to accept invitation');
    }
  }

  protected async declineInvitation(invitationId: string): Promise<void> {
    try {
      await this.teamsService.declineInvitation(invitationId);
      
      // Remove the declined invitation from the list
      const remaining = this.pendingInvitations().filter(inv => inv.id !== invitationId);
      this.pendingInvitations.set(remaining);
      
      // Close notification if no more invitations
      if (remaining.length === 0) {
        this.showInvitationNotification.set(false);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to decline invitation');
    }
  }
}