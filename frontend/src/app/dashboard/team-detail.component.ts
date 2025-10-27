import { Component, inject, ChangeDetectionStrategy, signal, OnInit, computed } from '@angular/core';
import { TeamsService, Team, TeamMember, TeamInvitation } from './teams.service';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../profile/users.service';

@Component({
  selector: 'app-team-detail',
  imports: [TitleCasePipe, DatePipe, FormsModule],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamDetailComponent implements OnInit {
  protected readonly teamsService = inject(TeamsService);
  protected readonly authService = inject(AuthService);
  protected readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly team = signal<Team | null>(null);
  protected readonly members = signal<TeamMember[]>([]);
  protected readonly pendingMembers = signal<TeamMember[]>([]);
  protected readonly activeMembers = signal<TeamMember[]>([]);
  protected readonly isLoadingMembers = signal(false);
  protected readonly showPendingMembers = signal(false);
  protected readonly showActiveMembers = signal(false);
  
  // Simplified role management - just array of role names
  protected readonly teamRoles = signal<string[]>([]);
  
  // Member role management signals
  protected readonly updatingMemberRoles = signal(false);
  
  // Role editor signals
  protected readonly showRoleEditor = signal(false);
  protected readonly editingRoles = signal<string[]>([]);
  protected readonly newRoleName = signal('');
  protected readonly isSavingRoles = signal(false);
  protected readonly roleEditorError = signal<string | null>(null);
  
  // Invitation signals
  protected readonly showInviteDialog = signal(false);
  protected readonly inviteEmail = signal('');
  protected readonly isSendingInvitation = signal(false);
  protected readonly invitationError = signal<string | null>(null);
  protected readonly teamInvitations = signal<TeamInvitation[]>([]);
  
  // Computed signal to check if current user is admin of this team
  protected readonly isTeamAdmin = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;
    
    const allMembers = this.members();
    const userMembership = allMembers.find(m => m.userId === currentUserId);
    
    return userMembership?.roles.includes('Administrator') || false;
  });
  
  // Computed signal for available roles
  protected readonly availableRoles = computed(() => {
    return this.teamRoles(); // Already an array of strings
  });

  async ngOnInit(): Promise<void> {
    const teamId = this.route.snapshot.paramMap.get('id');
    if (teamId) {
      await this.loadTeamDetails(teamId);
    }
  }

  private async loadTeamDetails(teamId: string): Promise<void> {
    try {
      // Load team details
      const teamData = await this.teamsService.getTeam(teamId);
      this.team.set(teamData);

      // Load members
      this.isLoadingMembers.set(true);
      const allMembers = await this.teamsService.getTeamMembers(teamId);
      this.members.set(allMembers);

      // Separate pending and active members
      const pending = allMembers.filter(m => m.status === 'pending');
      this.pendingMembers.set(pending);
      
      // Filter active members - include disabled users if current user is admin
      const currentUserId = this.authService.currentUser()?.id;
      const userMembership = allMembers.find(m => m.userId === currentUserId);
      const isAdmin = userMembership?.roles.includes('Administrator') || false;
      
      let active: TeamMember[];
      if (isAdmin) {
        // Admin sees all active members, including disabled users
        active = allMembers.filter(m => m.status === 'active');
      } else {
        // Non-admin only sees active members who are not disabled
        active = allMembers.filter(m => m.status === 'active' && m.user?.isActive !== false);
      }

      this.activeMembers.set(active);
      
      // Load team roles for role management
      if (isAdmin) {
        await this.loadTeamRoles();
      }
    } catch (error) {
      console.error('Error loading team details:', error);
    } finally {
      this.isLoadingMembers.set(false);
    }
  }

  protected togglePendingMembers(): void {
    this.showPendingMembers.set(!this.showPendingMembers());
  }

  protected toggleActiveMembers(): void {
    this.showActiveMembers.set(!this.showActiveMembers());
  }

  protected goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  protected async approveMember(userId: string): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    try {
      await this.teamsService.updateMemberStatus(teamId, userId, 'active');
      await this.loadTeamDetails(teamId);
    } catch (error: any) {
      alert(error.message || 'Failed to approve member');
    }
  }

  protected async rejectMember(userId: string): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    if (!confirm('Are you sure you want to reject this membership request?')) {
      return;
    }
    
    try {
      await this.teamsService.removeMember(teamId, userId);
      await this.loadTeamDetails(teamId);
    } catch (error: any) {
      alert(error.message || 'Failed to reject member');
    }
  }

  protected async toggleUserActiveStatus(userId: string, currentIsActive: boolean): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    const action = currentIsActive ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      await this.usersService.toggleUserActiveStatus(userId, !currentIsActive);
      await this.loadTeamDetails(teamId);
    } catch (error: any) {
      alert(error.message || `Failed to ${action} user`);
    }
  }

  // Simplified role loading
  private async loadTeamRoles(): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    try {
      const roles = await this.teamsService.getTeamRoles(teamId);
      this.teamRoles.set(roles);
    } catch (error: any) {
      console.error('Failed to load roles:', error);
    }
  }
  
  // Member role management methods
  protected memberHasRole(member: TeamMember, roleName: string): boolean {
    return member.roles.includes(roleName);
  }
  
  protected isUpdatingMemberRoles(): boolean {
    return this.updatingMemberRoles();
  }
  
  protected async toggleMemberRole(userId: string, roleName: string, event: Event): Promise<void> {
    const checkbox = event.target as HTMLInputElement;
    const shouldAdd = checkbox.checked;
    const teamId = this.team()?.id;
    
    if (!teamId) {
      checkbox.checked = !shouldAdd;
      return;
    }
    
    const member = this.members().find(m => m.userId === userId);
    if (!member) {
      checkbox.checked = !shouldAdd;
      return;
    }
    
    // Check if role exists
    if (shouldAdd && !this.teamRoles().includes(roleName)) {
      checkbox.checked = false;
      alert('Role not found');
      return;
    }
    
    let newRoles: string[];
    
    if (shouldAdd) {
      // Adding a role - first check if we need to remove conflicting roles
      const team = this.team();
      const conflictingRoles = this.getConflictingRoles(roleName);
      
      // Remove any conflicting roles that the member currently has
      const rolesToRemove = member.roles.filter(r => conflictingRoles.includes(r));
      newRoles = member.roles.filter(r => !conflictingRoles.includes(r));
      newRoles.push(roleName);
      
      // If we removed any roles, we need to update the UI to uncheck those checkboxes
      if (rolesToRemove.length > 0) {
        // The UI update will happen after the API call succeeds
      }
    } else {
      // Removing a role
      newRoles = member.roles.filter(r => r !== roleName);
    }
    
    this.updatingMemberRoles.set(true);
    
    try {
      await this.teamsService.updateMemberRoles(teamId, userId, newRoles);
      
      // Update local state
      const updatedMembers = this.members().map(m => 
        m.userId === userId ? { ...m, roles: newRoles } : m
      );
      this.members.set(updatedMembers);
      
      // Update active members list
      const currentUserId = this.authService.currentUser()?.id;
      const userMembership = updatedMembers.find(m => m.userId === currentUserId);
      const isAdmin = userMembership?.roles.includes('Administrator') || false;
      
      let active: TeamMember[];
      if (isAdmin) {
        active = updatedMembers.filter(m => m.status === 'active');
      } else {
        active = updatedMembers.filter(m => m.status === 'active' && m.user?.isActive !== false);
      }
      this.activeMembers.set(active);
    } catch (error: any) {
      checkbox.checked = !shouldAdd;
      alert(error.message || 'Failed to update member roles');
    } finally {
      this.updatingMemberRoles.set(false);
    }
  }
  
  // Helper method to parse role constraints and find conflicting roles
  private getConflictingRoles(roleName: string): string[] {
    const team = this.team();
    if (!team?.roleConstraints) return [];
    
    const constraints = team.roleConstraints
      .split(',')
      .map(pair => pair.trim())
      .filter(pair => pair.includes(':'))
      .map(pair => {
        const [role1, role2] = pair.split(':').map(r => r.trim());
        return [role1, role2];
      });
    
    const conflicting: string[] = [];
    for (const [role1, role2] of constraints) {
      if (role1 === roleName) {
        conflicting.push(role2);
      } else if (role2 === roleName) {
        conflicting.push(role1);
      }
    }
    
    return conflicting;
  }

  // Role Editor Methods
  protected openRoleEditor(): void {
    this.editingRoles.set([...this.teamRoles()]);
    this.newRoleName.set('');
    this.roleEditorError.set(null);
    this.showRoleEditor.set(true);
  }

  protected closeRoleEditor(): void {
    this.showRoleEditor.set(false);
    this.editingRoles.set([]);
    this.newRoleName.set('');
    this.roleEditorError.set(null);
  }

  protected canDeleteRole(roleName: string): boolean {
    return roleName !== 'Administrator';
  }

  protected removeRoleFromEditor(roleName: string): void {
    if (!this.canDeleteRole(roleName)) {
      return;
    }
    const currentRoles = this.editingRoles();
    this.editingRoles.set(currentRoles.filter(r => r !== roleName));
  }

  protected addRoleToEditor(): void {
    const roleName = this.newRoleName().trim();
    
    if (!roleName) {
      this.roleEditorError.set('Role name cannot be empty');
      return;
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(roleName)) {
      this.roleEditorError.set('Role name can only contain letters, numbers, spaces, dashes, and underscores');
      return;
    }

    const currentRoles = this.editingRoles();
    if (currentRoles.includes(roleName)) {
      this.roleEditorError.set('Role already exists');
      return;
    }

    this.editingRoles.set([...currentRoles, roleName]);
    this.newRoleName.set('');
    this.roleEditorError.set(null);
  }

  protected async saveRoles(): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    const roles = this.editingRoles();
    
    // Ensure Administrator role is always included
    if (!roles.includes('Administrator')) {
      this.roleEditorError.set('Administrator role cannot be removed');
      return;
    }

    this.isSavingRoles.set(true);
    this.roleEditorError.set(null);

    try {
      await this.teamsService.updateTeam(teamId, { roles });
      
      // Update local state
      this.teamRoles.set(roles);
      
      // Reload team details to ensure consistency
      await this.loadTeamDetails(teamId);
      
      this.closeRoleEditor();
    } catch (error: any) {
      this.roleEditorError.set(error.message || 'Failed to save roles');
    } finally {
      this.isSavingRoles.set(false);
    }
  }

  // Invitation Methods
  protected async loadInvitations(): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    try {
      const invitations = await this.teamsService.getTeamInvitations(teamId);
      this.teamInvitations.set(invitations);
    } catch (error: any) {
      console.error('Failed to load invitations:', error);
    }
  }

  protected openInviteDialog(): void {
    this.inviteEmail.set('');
    this.invitationError.set(null);
    this.showInviteDialog.set(true);
    this.loadInvitations();
  }

  protected closeInviteDialog(): void {
    this.showInviteDialog.set(false);
    this.inviteEmail.set('');
    this.invitationError.set(null);
  }

  protected async sendInvitation(): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    const email = this.inviteEmail().trim();
    
    if (!email) {
      this.invitationError.set('Email address is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.invitationError.set('Please enter a valid email address');
      return;
    }

    this.isSendingInvitation.set(true);
    this.invitationError.set(null);

    try {
      await this.teamsService.sendInvitation(teamId, email);
      this.inviteEmail.set('');
      
      // Reload invitations list
      await this.loadInvitations();
    } catch (error: any) {
      this.invitationError.set(error.message || 'Failed to send invitation');
    } finally {
      this.isSendingInvitation.set(false);
    }
  }
}
