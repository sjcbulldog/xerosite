import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Subteam, CreateSubteamRequest, UpdateSubteamRequest } from './subteam.types';

export interface Team {
  id: string;
  name: string;
  teamNumber: number;
  description?: string;
  roles: string[];
  roleConstraints?: string;
  visibility: 'public' | 'private';
  timezone?: string;
  memberCount?: number;
  pendingCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermission {
  permission: 'SEND_MESSAGES' | 'SCHEDULE_EVENTS';
  enabled: boolean;
}

export interface TeamMember {
  userId: string;
  teamId: string;
  roles: string[];
  status: 'pending' | 'active' | 'disabled';
  subteams?: string[]; // Names of subteams this member belongs to
  leadPositions?: Array<{ subteamName: string; positionTitle: string }>; // Lead positions this member holds
  permissions?: UserPermission[]; // User's permissions for this team
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    primaryEmail?: string;
    primaryPhone?: string;
    isActive: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamRequest {
  name: string;
  teamNumber: number;
  description?: string;
  visibility?: 'public' | 'private';
  timezone?: string;
  roles?: string[];
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  invitedBy?: string;
  status: 'pending' | 'accepted' | 'declined';
  teamName?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TeamsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/teams';

  private readonly userTeamsSignal = signal<Team[]>([]);
  private readonly publicTeamsSignal = signal<Team[]>([]);
  private readonly pendingTeamsSignal = signal<Team[]>([]);

  public readonly userTeams = this.userTeamsSignal.asReadonly();
  public readonly publicTeams = this.publicTeamsSignal.asReadonly();
  public readonly pendingTeams = this.pendingTeamsSignal.asReadonly();

  async loadUserTeams(userId: string): Promise<void> {
    try {
      const allTeams = await firstValueFrom(
        this.http.get<Team[]>(this.apiUrl)
      );
      
      // Get user's active team memberships
      const userTeamIds = new Set<string>();
      for (const team of allTeams) {
        const members = await this.getTeamMembers(team.id);
        const userMember = members.find(m => m.userId === userId);
        // Only include active memberships
        if (userMember && userMember.status === 'active') {
          userTeamIds.add(team.id);
        }
      }
      
      const userTeamsList = allTeams.filter(t => userTeamIds.has(t.id));
      this.userTeamsSignal.set(userTeamsList);
    } catch (error) {
      console.error('Error loading user teams:', error);
      throw error;
    }
  }

  async loadPublicTeams(userId: string): Promise<void> {
    try {
      // Use the new endpoint that filters out disabled teams
      const publicTeamsList = await firstValueFrom(
        this.http.get<Team[]>(`${this.apiUrl}/public/available`)
      );
      
      // Get user's team memberships to filter out teams user is already in or has pending requests
      const userTeamIds = new Set<string>();
      const pendingTeamIds = new Set<string>();
      
      for (const team of publicTeamsList) {
        const members = await this.getTeamMembers(team.id);
        const userMember = members.find(m => m.userId === userId);
        if (userMember) {
          if (userMember.status === 'active') {
            userTeamIds.add(team.id);
          } else if (userMember.status === 'pending') {
            pendingTeamIds.add(team.id);
          }
        }
      }
      
      // Filter out teams where user is an active member or has pending request
      const availableTeams = publicTeamsList.filter(
        t => !userTeamIds.has(t.id) && !pendingTeamIds.has(t.id)
      );
      this.publicTeamsSignal.set(availableTeams);
    } catch (error) {
      console.error('Error loading public teams:', error);
      throw error;
    }
  }

  async loadPendingTeams(userId: string): Promise<void> {
    try {
      const allTeams = await firstValueFrom(
        this.http.get<Team[]>(this.apiUrl)
      );
      
      // Get teams where user has pending membership
      const pendingTeamsList: Team[] = [];
      for (const team of allTeams) {
        const members = await this.getTeamMembers(team.id);
        const userMember = members.find(m => m.userId === userId);
        if (userMember && userMember.status === 'pending') {
          pendingTeamsList.push(team);
        }
      }
      
      this.pendingTeamsSignal.set(pendingTeamsList);
    } catch (error) {
      console.error('Error loading pending teams:', error);
      throw error;
    }
  }

  async createTeam(teamData: CreateTeamRequest, userId: string): Promise<Team> {
    try {
      // Create the team
      const team = await firstValueFrom(
        this.http.post<Team>(this.apiUrl, teamData)
      );

      // Add creator as admin member with active status
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/${team.id}/members`, {
          userId: userId,
          roles: ['Administrator'],
          status: 'active'
        })
      );

      return team;
    } catch (error: any) {
      console.error('Error creating team:', error);
      throw new Error(error.error?.message || 'Failed to create team');
    }
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      return await firstValueFrom(
        this.http.get<TeamMember[]>(`${this.apiUrl}/${teamId}/members`)
      );
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
  }

  async joinTeam(teamId: string, userId: string, roles: string[] = ['Student']): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/${teamId}/members`, {
          userId: userId,
          roles: roles
        })
      );
    } catch (error: any) {
      console.error('Error joining team:', error);
      throw new Error(error.error?.message || 'Failed to join team');
    }
  }

  async requestToJoinTeam(teamId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<TeamMember>(`${this.apiUrl}/${teamId}/request-join`, {})
      );
    } catch (error: any) {
      console.error('Error requesting to join team:', error);
      throw new Error(error.error?.message || 'Failed to request to join team');
    }
  }

  async deleteTeam(teamId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/${teamId}`)
      );
      
      // Remove from local state
      const updatedUserTeams = this.userTeamsSignal().filter(t => t.id !== teamId);
      this.userTeamsSignal.set(updatedUserTeams);
      
      const updatedPublicTeams = this.publicTeamsSignal().filter(t => t.id !== teamId);
      this.publicTeamsSignal.set(updatedPublicTeams);
    } catch (error: any) {
      console.error('Error deleting team:', error);
      throw new Error(error.error?.message || 'Failed to delete team');
    }
  }

  async updateMemberStatus(teamId: string, userId: string, status: 'pending' | 'active' | 'disabled'): Promise<TeamMember> {
    try {
      return await firstValueFrom(
        this.http.patch<TeamMember>(`${this.apiUrl}/${teamId}/members/${userId}/status`, { status })
      );
    } catch (error: any) {
      console.error('Error updating member status:', error);
      throw new Error(error.error?.message || 'Failed to update member status');
    }
  }

  async getTeam(teamId: string): Promise<Team> {
    try {
      return await firstValueFrom(
        this.http.get<Team>(`${this.apiUrl}/${teamId}`)
      );
    } catch (error: any) {
      console.error('Error getting team:', error);
      throw new Error(error.error?.message || 'Failed to get team');
    }
  }

  async updateTeam(teamId: string, updateData: { roles?: string[], roleConstraints?: string, description?: string, visibility?: 'public' | 'private', timezone?: string }): Promise<Team> {
    try {
      return await firstValueFrom(
        this.http.patch<Team>(`${this.apiUrl}/${teamId}`, updateData)
      );
    } catch (error: any) {
      console.error('Error updating team:', error);
      throw new Error(error.error?.message || 'Failed to update team');
    }
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/${teamId}/members/${userId}`)
      );
    } catch (error: any) {
      console.error('Error removing member:', error);
      throw new Error(error.error?.message || 'Failed to remove member');
    }
  }

  // Role Management Methods - simplified to just return role names
  async getTeamRoles(teamId: string): Promise<string[]> {
    try {
      return await firstValueFrom(
        this.http.get<string[]>(`${this.apiUrl}/${teamId}/roles`)
      );
    } catch (error: any) {
      console.error('Error getting team roles:', error);
      throw new Error(error.error?.message || 'Failed to get team roles');
    }
  }
  
  async updateMemberRoles(teamId: string, userId: string, roles: string[]): Promise<TeamMember> {
    try {
      return await firstValueFrom(
        this.http.patch<TeamMember>(`${this.apiUrl}/${teamId}/members/${userId}`, { roles })
      );
    } catch (error: any) {
      console.error('Error updating member roles:', error);
      throw new Error(error.error?.message || 'Failed to update member roles');
    }
  }

  async updateMemberAttributes(
    teamId: string, 
    userId: string, 
    updateData: {
      roles?: string[];
      isActive?: boolean;
      permissions?: UserPermission[];
    }
  ): Promise<TeamMember> {
    try {
      return await firstValueFrom(
        this.http.patch<TeamMember>(`${this.apiUrl}/${teamId}/members/${userId}/attributes`, updateData)
      );
    } catch (error: any) {
      console.error('Error updating member attributes:', error);
      throw new Error(error.error?.message || 'Failed to update member attributes');
    }
  }

  // Invitation Management Methods
  async sendInvitation(teamId: string, email: string): Promise<TeamInvitation> {
    try {
      return await firstValueFrom(
        this.http.post<TeamInvitation>(`${this.apiUrl}/${teamId}/invitations`, { email })
      );
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      throw new Error(error.error?.message || 'Failed to send invitation');
    }
  }

  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    try {
      return await firstValueFrom(
        this.http.get<TeamInvitation[]>(`${this.apiUrl}/${teamId}/invitations`)
      );
    } catch (error: any) {
      console.error('Error getting team invitations:', error);
      throw new Error(error.error?.message || 'Failed to get team invitations');
    }
  }

  async getUserInvitations(): Promise<TeamInvitation[]> {
    try {
      return await firstValueFrom(
        this.http.get<TeamInvitation[]>(`${this.apiUrl}/invitations/user`)
      );
    } catch (error: any) {
      console.error('Error getting user invitations:', error);
      throw new Error(error.error?.message || 'Failed to get user invitations');
    }
  }

  async acceptInvitation(invitationId: string): Promise<TeamMember> {
    try {
      return await firstValueFrom(
        this.http.post<TeamMember>(`${this.apiUrl}/invitations/${invitationId}/accept`, {})
      );
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      throw new Error(error.error?.message || 'Failed to accept invitation');
    }
  }

  async declineInvitation(invitationId: string): Promise<TeamInvitation> {
    try {
      return await firstValueFrom(
        this.http.post<TeamInvitation>(`${this.apiUrl}/invitations/${invitationId}/decline`, {})
      );
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      throw new Error(error.error?.message || 'Failed to decline invitation');
    }
  }

  async getRoleConstraints(teamId: string): Promise<Array<[string, string]>> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ constraints: Array<[string, string]> }>(`${this.apiUrl}/${teamId}/constraints`)
      );
      return response.constraints;
    } catch (error: any) {
      console.error('Error getting role constraints:', error);
      throw new Error(error.error?.message || 'Failed to get role constraints');
    }
  }

  async updateRoleConstraints(teamId: string, constraints: Array<[string, string]>): Promise<Array<[string, string]>> {
    try {
      const body = {
        constraints: constraints.map(([role1, role2]) => ({ role1, role2 }))
      };
      const response = await firstValueFrom(
        this.http.patch<{ constraints: Array<[string, string]> }>(`${this.apiUrl}/${teamId}/constraints`, body)
      );
      return response.constraints;
    } catch (error: any) {
      console.error('Error updating role constraints:', error);
      throw new Error(error.error?.message || 'Failed to update role constraints');
    }
  }

  async importRoster(teamId: string, members: any[], defaultPassword?: string, defaultStatus?: 'pending' | 'active', sendEmails?: boolean): Promise<any> {
    try {
      const body: any = { members };
      if (defaultPassword) {
        body.defaultPassword = defaultPassword;
      }
      if (defaultStatus) {
        body.defaultStatus = defaultStatus;
      }
      if (sendEmails !== undefined) {
        body.sendEmails = sendEmails;
      }
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/${teamId}/import-roster`, body)
      );
      return response;
    } catch (error: any) {
      console.error('Error importing roster:', error);
      throw new Error(error.error?.message || 'Failed to import roster');
    }
  }

  // Subteam management methods
  async getTeamSubteams(teamId: string): Promise<Subteam[]> {
    try {
      return await firstValueFrom(
        this.http.get<Subteam[]>(`${this.apiUrl}/${teamId}/subteams`)
      );
    } catch (error: any) {
      console.error('Error fetching subteams:', error);
      throw new Error(error.error?.message || 'Failed to fetch subteams');
    }
  }

  async getSubteam(teamId: string, subteamId: string): Promise<Subteam> {
    try {
      return await firstValueFrom(
        this.http.get<Subteam>(`${this.apiUrl}/${teamId}/subteams/${subteamId}`)
      );
    } catch (error: any) {
      console.error('Error fetching subteam:', error);
      throw new Error(error.error?.message || 'Failed to fetch subteam');
    }
  }

  async createSubteam(teamId: string, data: CreateSubteamRequest): Promise<Subteam> {
    try {
      return await firstValueFrom(
        this.http.post<Subteam>(`${this.apiUrl}/${teamId}/subteams`, data)
      );
    } catch (error: any) {
      console.error('Error creating subteam:', error);
      throw new Error(error.error?.message || 'Failed to create subteam');
    }
  }

  async updateSubteam(teamId: string, subteamId: string, data: UpdateSubteamRequest): Promise<Subteam> {
    try {
      return await firstValueFrom(
        this.http.patch<Subteam>(`${this.apiUrl}/${teamId}/subteams/${subteamId}`, data)
      );
    } catch (error: any) {
      console.error('Error updating subteam:', error);
      throw new Error(error.error?.message || 'Failed to update subteam');
    }
  }

  async deleteSubteam(teamId: string, subteamId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/${teamId}/subteams/${subteamId}`)
      );
    } catch (error: any) {
      console.error('Error deleting subteam:', error);
      throw new Error(error.error?.message || 'Failed to delete subteam');
    }
  }

  async addSubteamMembers(teamId: string, subteamId: string, userIds: string[]): Promise<Subteam> {
    try {
      return await firstValueFrom(
        this.http.post<Subteam>(`${this.apiUrl}/${teamId}/subteams/${subteamId}/members`, { userIds })
      );
    } catch (error: any) {
      console.error('Error adding subteam members:', error);
      throw new Error(error.error?.message || 'Failed to add members');
    }
  }

  async removeSubteamMember(teamId: string, subteamId: string, userId: string): Promise<Subteam> {
    try {
      return await firstValueFrom(
        this.http.request<Subteam>('DELETE', `${this.apiUrl}/${teamId}/subteams/${subteamId}/members`, {
          body: { userId }
        })
      );
    } catch (error: any) {
      console.error('Error removing subteam member:', error);
      throw new Error(error.error?.message || 'Failed to remove member');
    }
  }

  async updateLeadPosition(teamId: string, subteamId: string, positionId: string, userId?: string): Promise<Subteam> {
    try {
      return await firstValueFrom(
        this.http.patch<Subteam>(`${this.apiUrl}/${teamId}/subteams/${subteamId}/lead-positions`, {
          positionId,
          userId: userId || null
        })
      );
    } catch (error: any) {
      console.error('Error updating lead position:', error);
      throw new Error(error.error?.message || 'Failed to update lead position');
    }
  }

  async deleteLeadPosition(teamId: string, subteamId: string, positionId: string): Promise<Subteam> {
    try {
      return await firstValueFrom(
        this.http.delete<Subteam>(`${this.apiUrl}/${teamId}/subteams/${subteamId}/lead-positions/${positionId}`)
      );
    } catch (error: any) {
      console.error('Error deleting lead position:', error);
      throw new Error(error.error?.message || 'Failed to delete lead position');
    }
  }

  async getSiteStatistics(): Promise<{ publicTeamsCount: number; privateTeamsCount: number; totalUsersCount: number }> {
    try {
      return await firstValueFrom(
        this.http.get<{ publicTeamsCount: number; privateTeamsCount: number; totalUsersCount: number }>(`${this.apiUrl}/statistics`)
      );
    } catch (error: any) {
      console.error('Error loading site statistics:', error);
      throw new Error(error.error?.message || 'Failed to load site statistics');
    }
  }
}
