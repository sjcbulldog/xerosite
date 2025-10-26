import { Component, inject, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { TeamsService, Team, TeamMember } from './teams.service';
import { TitleCasePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-team-detail',
  imports: [TitleCasePipe],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamDetailComponent implements OnInit {
  protected readonly teamsService = inject(TeamsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly team = signal<Team | null>(null);
  protected readonly members = signal<TeamMember[]>([]);
  protected readonly pendingMembers = signal<TeamMember[]>([]);
  protected readonly activeMembers = signal<TeamMember[]>([]);
  protected readonly isLoadingMembers = signal(false);
  protected readonly showPendingMembers = signal(false);
  protected readonly showActiveMembers = signal(false);

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
      const active = allMembers.filter(m => m.status === 'active');

      this.pendingMembers.set(pending);
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
}
