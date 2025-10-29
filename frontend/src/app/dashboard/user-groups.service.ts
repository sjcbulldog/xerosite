import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface UserGroup {
  id: string;
  teamId: string;
  name: string;
  isPublic: boolean;
  createdBy: string;
  visibilityRules?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserGroupRequest {
  name: string;
  isPublic: boolean;
  visibilityRules?: any;
}

export interface UpdateUserGroupRequest {
  name?: string;
  isPublic?: boolean;
  visibilityRules?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserGroupsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/teams';

  async createUserGroup(teamId: string, request: CreateUserGroupRequest): Promise<UserGroup> {
    try {
      return await firstValueFrom(
        this.http.post<UserGroup>(`${this.apiUrl}/${teamId}/user-groups`, request)
      );
    } catch (error: any) {
      console.error('Error creating user group:', error);
      throw new Error(error.error?.message || 'Failed to create user group');
    }
  }

  async getUserGroups(teamId: string): Promise<UserGroup[]> {
    try {
      return await firstValueFrom(
        this.http.get<UserGroup[]>(`${this.apiUrl}/${teamId}/user-groups`)
      );
    } catch (error: any) {
      console.error('Error getting user groups:', error);
      throw new Error(error.error?.message || 'Failed to get user groups');
    }
  }

  async getUserGroup(teamId: string, groupId: string): Promise<UserGroup> {
    try {
      return await firstValueFrom(
        this.http.get<UserGroup>(`${this.apiUrl}/${teamId}/user-groups/${groupId}`)
      );
    } catch (error: any) {
      console.error('Error getting user group:', error);
      throw new Error(error.error?.message || 'Failed to get user group');
    }
  }

  async updateUserGroup(teamId: string, groupId: string, request: UpdateUserGroupRequest): Promise<UserGroup> {
    try {
      return await firstValueFrom(
        this.http.patch<UserGroup>(`${this.apiUrl}/${teamId}/user-groups/${groupId}`, request)
      );
    } catch (error: any) {
      console.error('Error updating user group:', error);
      throw new Error(error.error?.message || 'Failed to update user group');
    }
  }

  async deleteUserGroup(teamId: string, groupId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.apiUrl}/${teamId}/user-groups/${groupId}`)
      );
    } catch (error: any) {
      console.error('Error deleting user group:', error);
      throw new Error(error.error?.message || 'Failed to delete user group');
    }
  }
}
