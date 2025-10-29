import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface UpdateProfileRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  emails: Array<{
    id?: string | null;
    email: string;
    emailType: string;
    isPrimary: boolean;
  }>;
  phones: Array<{
    id?: string | null;
    phoneNumber: string;
    phoneType: string;
    isPrimary: boolean;
  }>;
  addresses: Array<{
    id?: string | null;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
    addressType: string;
    isPrimary: boolean;
  }>;
}

export interface UserProfile {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  primaryEmail: string;
  state: string;
  emails: Array<{
    id: string;
    email: string;
    emailType: string;
    isPrimary: boolean;
  }>;
  phones: Array<{
    id: string;
    phoneNumber: string;
    phoneType: string;
    isPrimary: boolean;
  }>;
  addresses: Array<{
    id: string;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
    addressType: string;
    isPrimary: boolean;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/users';

  async getAllUsers(): Promise<UserProfile[]> {
    return firstValueFrom(
      this.http.get<UserProfile[]>(this.apiUrl)
    );
  }

  async getProfile(userId: string): Promise<UserProfile> {
    return firstValueFrom(
      this.http.get<UserProfile>(`${this.apiUrl}/${userId}`)
    );
  }

  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
    return firstValueFrom(
      this.http.patch<UserProfile>(`${this.apiUrl}/${userId}/profile`, data)
    );
  }

  async toggleUserActiveStatus(userId: string, isActive: boolean): Promise<UserProfile> {
    return firstValueFrom(
      this.http.patch<UserProfile>(`${this.apiUrl}/${userId}/active`, { isActive })
    );
  }

  async updateUserState(userId: string, state: string): Promise<UserProfile> {
    return firstValueFrom(
      this.http.patch<UserProfile>(`${this.apiUrl}/${userId}/state`, { state })
    );
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.patch<{ message: string }>(`${this.apiUrl}/${userId}/password`, {
        currentPassword,
        newPassword
      })
    );
  }

  async adminChangePassword(userId: string, newPassword: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.patch<{ message: string }>(`${this.apiUrl}/${userId}/admin-password`, {
        newPassword
      })
    );
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
<<<<<<< HEAD
    return firstValueFrom(
      this.http.delete<{ message: string }>(`${this.apiUrl}/${userId}`)
    );
=======
    try {
      return await firstValueFrom(
        this.http.delete<{ message: string }>(`${this.apiUrl}/${userId}`)
      );
    } catch (error: any) {
      const errorMessage = error.error?.message || error.message || 'Failed to delete user';
      throw new Error(errorMessage);
    }
>>>>>>> butch
  }
}
