import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface User {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  state: 'pending' | 'active' | 'admin' | 'disabled';
  primaryEmail?: string;
  fullName: string;
  isSiteAdmin: boolean;
  emails: any[];
  phones: any[];
  addresses: any[];
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface LoginResponse {
  access_token: string;
  user: User;
  message?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/auth';

  private readonly currentUserSignal = signal<User | null>(null);
  private readonly isAuthenticatedSignal = signal<boolean>(false);
  private readonly isAuthReadySignal = signal<boolean>(false);

  // Public readonly signals
  public readonly currentUser = this.currentUserSignal.asReadonly();
  public readonly isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  public readonly isAuthReady = this.isAuthReadySignal.asReadonly();

  constructor() {
    // Initialization will be handled by APP_INITIALIZER
  }

  // Called by APP_INITIALIZER to ensure auth is loaded before app starts
  async initialize(): Promise<void> {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        // Fetch current user data from the server
        const user = await firstValueFrom(
          this.http.get<User>(`${this.apiUrl}/me`)
        );
        this.currentUserSignal.set(user);
        this.isAuthenticatedSignal.set(true);
      } catch (error) {
        // Token is invalid, clear it
        console.error('Failed to fetch user data, token may be invalid:', error);
        localStorage.removeItem('auth_token');
        this.isAuthenticatedSignal.set(false);
      }
    }
    // Mark auth as ready (whether we found a valid token or not)
    this.isAuthReadySignal.set(true);
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
          email,
          password
        })
      );

      // Store token and user data
      localStorage.setItem('auth_token', response.access_token);
      this.currentUserSignal.set(response.user);
      this.isAuthenticatedSignal.set(true);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.error?.message || 'Login failed');
    }
  }

  async register(userData: RegisterRequest): Promise<LoginResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.apiUrl}/simple-register`, userData)
      );

      // Check if user is active or admin before setting authentication state
      if (response.user.state === 'active' || response.user.state === 'admin') {
        // Store token and user data for active/admin users
        localStorage.setItem('auth_token', response.access_token);
        this.currentUserSignal.set(response.user);
        this.isAuthenticatedSignal.set(true);
      } else {
        // For pending/disabled users, don't set authenticated state
        // but still store user data temporarily to show appropriate message
        this.currentUserSignal.set(response.user);
        this.isAuthenticatedSignal.set(false);
      }
      
      return response;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.error?.message || 'Registration failed');
    }
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
  }

  async refreshCurrentUser(): Promise<void> {
    const token = this.getToken();
    if (!token || !this.currentUser()?.id) return;

    try {
      const response = await firstValueFrom(
        this.http.get<User>(`/api/users/${this.currentUser()!.id}`)
      );
      this.currentUserSignal.set(response);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email })
      );
      return response;
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw new Error(error.error?.message || 'Failed to send reset email');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, {
          token,
          newPassword
        })
      );
      return response;
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.error?.message || 'Failed to reset password');
    }
  }
}