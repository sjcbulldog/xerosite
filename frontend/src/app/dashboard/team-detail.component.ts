import { Component, inject, ChangeDetectionStrategy, signal, OnInit, computed } from '@angular/core';
import { TeamsService, Team, TeamMember } from './teams.service';
import { TitleCasePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../profile/users.service';

@Component({
  selector: 'app-team-detail',
  imports: [TitleCasePipe],
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
  
  // Computed signal to check if current user is admin of this team
  protected readonly isTeamAdmin = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;
    
    const allMembers = this.members();
    const userMembership = allMembers.find(m => m.userId === currentUserId);
    
    return userMembership?.roles.includes('admin') || false;
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
      const isAdmin = userMembership?.roles.includes('admin') || false;
      
      let active: TeamMember[];
      if (isAdmin) {
        // Admin sees all active members, including disabled users
        active = allMembers.filter(m => m.status === 'active');
      } else {
        // Non-admin only sees active members who are not disabled
        active = allMembers.filter(m => m.status === 'active' && m.user?.isActive !== false);
      }

      this.activeMembers.set(active);
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
}
