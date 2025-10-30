import { Component, inject, ChangeDetectionStrategy, signal, computed, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TeamsService, TeamInvitation } from './teams.service';
import { UsersService, UserProfile } from '../profile/users.service';
import { PreferencesDialogComponent } from '../preferences/preferences-dialog.component';
import { TestMessageDialogComponent } from './test-message-dialog.component';
import { HelpDialogComponent } from './help-dialog.component';
import { COMMON_TIMEZONES } from './timezones';

type SortField = 'firstName' | 'lastName' | 'email';
type SortDirection = 'asc' | 'desc';

interface ChangePasswordForm {
  currentPassword: FormControl<string>;
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
}

interface CreateTeamForm {
  name: FormControl<string>;
  teamNumber: FormControl<number | null>;
  description: FormControl<string>;
  visibility: FormControl<'public' | 'private'>;
  timezone: FormControl<string>;
}

@Component({
  selector: 'app-dashboard',
  imports: [TitleCasePipe, DatePipe, ReactiveFormsModule, FormsModule, PreferencesDialogComponent, TestMessageDialogComponent, HelpDialogComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly teamsService = inject(TeamsService);
  protected readonly usersService = inject(UsersService);
  private readonly router = inject(Router);

  // Expose timezones for template
  protected readonly COMMON_TIMEZONES = COMMON_TIMEZONES;

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
  
  // Site statistics signals
  protected readonly publicTeamsCount = signal<number>(0);
  protected readonly privateTeamsCount = signal<number>(0);
  protected readonly totalUsersCount = signal<number>(0);
  protected readonly isLoadingStatistics = signal(false);
  
  // Change password dialog signals
  protected readonly showChangePasswordDialog = signal(false);
  protected readonly isChangingPassword = signal(false);
  protected readonly changePasswordError = signal<string | null>(null);
  protected readonly changePasswordSuccess = signal<string | null>(null);
  
  // Preferences dialog signal
  protected readonly showPreferencesDialog = signal(false);
  
  // Test message dialog signal
  protected readonly showTestMessageDialog = signal(false);
  
  // Help dialog signal
  protected readonly showHelpDialog = signal(false);
  
  // Password requirement signals - must be defined before form
  protected readonly newPasswordValue = signal('');
  
  protected readonly hasMinLength = computed(() => this.newPasswordValue().length >= 8);
  protected readonly hasUpperCase = computed(() => /[A-Z]/.test(this.newPasswordValue()));
  protected readonly hasLowerCase = computed(() => /[a-z]/.test(this.newPasswordValue()));
  protected readonly hasNumber = computed(() => /[0-9]/.test(this.newPasswordValue()));
  protected readonly hasSymbol = computed(() => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.newPasswordValue()));
  
  protected readonly changePasswordForm = new FormGroup<ChangePasswordForm>({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, (control) => this.passwordValidator(control)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  }, {
    validators: [(control) => this.passwordMatchValidator(control)]
  });
  
  // User sorting signals
  protected readonly userSortField = signal<SortField>('firstName');
  protected readonly userSortDirection = signal<SortDirection>('asc');
  protected readonly userSearchFilter = signal<string>('');
  
  // Public teams filter signal
  protected readonly publicTeamsSearchFilter = signal<string>('');
  
  // User actions menu signal
  protected readonly openUserActionsMenuId = signal<string | null>(null);
  protected readonly userActionsMenuPosition = signal<{ top: number; left: number } | null>(null);
  
  // Change user password dialog signals
  protected readonly showChangeUserPasswordDialog = signal(false);
  protected readonly selectedUser = signal<UserProfile | null>(null);
  protected readonly newUserPassword = signal('');
  protected readonly confirmUserPassword = signal('');
  protected readonly isChangingUserPassword = signal(false);
  protected readonly changeUserPasswordError = signal<string | null>(null);
  
  // Password requirements for user password change
  protected readonly userPasswordHasMinLength = computed(() => this.newUserPassword().length >= 8);
  protected readonly userPasswordHasUpperCase = computed(() => /[A-Z]/.test(this.newUserPassword()));
  protected readonly userPasswordHasLowerCase = computed(() => /[a-z]/.test(this.newUserPassword()));
  protected readonly userPasswordHasNumber = computed(() => /[0-9]/.test(this.newUserPassword()));
  protected readonly userPasswordHasSymbol = computed(() => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.newUserPassword()));
  
  // Delete user confirmation dialog signals
  protected readonly showDeleteUserDialog = signal(false);
  protected readonly userToDelete = signal<UserProfile | null>(null);
  protected readonly isDeletingUser = signal(false);
  protected readonly deleteUserError = signal<string | null>(null);
  
  // Computed signal for sorted users
  protected readonly sortedUsers = computed(() => {
    const users = [...this.allUsers()];
    const field = this.userSortField();
    const direction = this.userSortDirection();
    const searchText = this.userSearchFilter().toLowerCase();
    
    // Filter users based on search text
    const filteredUsers = searchText === '' 
      ? users
      : users.filter(u => 
          u.firstName.toLowerCase().includes(searchText) ||
          u.lastName.toLowerCase().includes(searchText) ||
          u.primaryEmail.toLowerCase().includes(searchText)
        );
    
    filteredUsers.sort((a, b) => {
      let aValue: string;
      let bValue: string;
      
      if (field === 'firstName') {
        aValue = a.firstName.toLowerCase();
        bValue = b.firstName.toLowerCase();
      } else if (field === 'lastName') {
        aValue = a.lastName.toLowerCase();
        bValue = b.lastName.toLowerCase();
      } else { // email
        aValue = a.primaryEmail.toLowerCase();
        bValue = b.primaryEmail.toLowerCase();
      }
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filteredUsers;
  });
  
  // Computed signal for filtered public teams
  protected readonly filteredPublicTeams = computed(() => {
    const teams = this.teamsService.publicTeams();
    const searchText = this.publicTeamsSearchFilter().toLowerCase();
    
    if (searchText === '') {
      return teams;
    }
    
    return teams.filter(t => 
      t.name.toLowerCase().includes(searchText) ||
      t.teamNumber.toString().includes(searchText) ||
      (t.description && t.description.toLowerCase().includes(searchText))
    );
  });
  
  // Invitation signals
  protected readonly showInvitationNotification = signal(false);
  protected readonly pendingInvitations = signal<TeamInvitation[]>([]);
  protected readonly isLoadingInvitations = signal(false);

  protected readonly createTeamForm = new FormGroup<CreateTeamForm>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)] }),
    teamNumber: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1), Validators.max(30000)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    visibility: new FormControl<'public' | 'private'>('private', { nonNullable: true, validators: [Validators.required] }),
    timezone: new FormControl('America/New_York', { nonNullable: true, validators: [Validators.required] })
  });

  async ngOnInit(): Promise<void> {
    // Auth is guaranteed to be ready thanks to APP_INITIALIZER
    // If not authenticated, redirect to login
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Listen for test message dialog close event
    window.addEventListener('closeTestMessageDialog', () => {
      this.closeTestMessageDialog();
    });
    
    await this.loadTeams();
    if (this.isAdmin()) {
      await this.loadAllUsers();
    }
    await this.checkPendingInvitations();
    await this.loadPublicTeamsInitial();
    await this.loadSiteStatistics();
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

  private async loadSiteStatistics(): Promise<void> {
    this.isLoadingStatistics.set(true);
    try {
      const stats = await this.teamsService.getSiteStatistics();
      this.publicTeamsCount.set(stats.publicTeamsCount);
      this.privateTeamsCount.set(stats.privateTeamsCount);
      this.totalUsersCount.set(stats.totalUsersCount);
    } catch (error: any) {
      console.error('Error loading site statistics:', error);
    } finally {
      this.isLoadingStatistics.set(false);
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

  private async loadPublicTeamsInitial(): Promise<void> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    try {
      await this.teamsService.loadPublicTeams(userId);
    } catch (error) {
      console.error('Error loading public teams:', error);
    }
  }

  protected openCreateTeamDialog(): void {
    this.showCreateTeamDialog.set(true);
    this.createTeamForm.reset({ visibility: 'private', teamNumber: null, timezone: 'America/New_York' });
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
        visibility: formValue.visibility,
        timezone: formValue.timezone
      }, userId);

      this.closeCreateTeamDialog();
      await this.loadTeams();
      await this.loadSiteStatistics(); // Refresh statistics after creating team
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
    this.openUserActionsMenuId.set(null);
    this.router.navigate(['/profile', userId]);
  }

  protected toggleUserActionsMenu(userId: string, event: MouseEvent): void {
    if (this.openUserActionsMenuId() === userId) {
      this.openUserActionsMenuId.set(null);
      this.userActionsMenuPosition.set(null);
    } else {
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      
      // Calculate position below the button
      this.userActionsMenuPosition.set({
        top: rect.bottom + 8,
        left: rect.right - 180 // Align right edge (180px is min-width of dropdown)
      });
      
      this.openUserActionsMenuId.set(userId);
    }
  }

  protected openChangeUserPasswordDialog(user: UserProfile): void {
    this.openUserActionsMenuId.set(null);
    this.selectedUser.set(user);
    this.newUserPassword.set('');
    this.confirmUserPassword.set('');
    this.changeUserPasswordError.set(null);
    this.showChangeUserPasswordDialog.set(true);
  }

  protected closeChangeUserPasswordDialog(): void {
    this.showChangeUserPasswordDialog.set(false);
    this.selectedUser.set(null);
    this.newUserPassword.set('');
    this.confirmUserPassword.set('');
    this.changeUserPasswordError.set(null);
  }

  protected async changeUserPassword(): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    const newPassword = this.newUserPassword();
    const confirmPassword = this.confirmUserPassword();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      this.changeUserPasswordError.set('Passwords do not match');
      return;
    }

    // Validate password requirements
    if (!this.userPasswordHasMinLength() || !this.userPasswordHasUpperCase() || 
        !this.userPasswordHasLowerCase() || !this.userPasswordHasNumber() || 
        !this.userPasswordHasSymbol()) {
      this.changeUserPasswordError.set('Password does not meet all requirements');
      return;
    }

    this.isChangingUserPassword.set(true);
    this.changeUserPasswordError.set(null);

    try {
      await this.usersService.adminChangePassword(user.id, newPassword);
      this.closeChangeUserPasswordDialog();
    } catch (error: any) {
      this.changeUserPasswordError.set(error.message || 'Failed to change password');
    } finally {
      this.isChangingUserPassword.set(false);
    }
  }

  protected openDeleteUserDialog(user: UserProfile): void {
    this.openUserActionsMenuId.set(null);
    this.userToDelete.set(user);
    this.deleteUserError.set(null);
    this.showDeleteUserDialog.set(true);
  }

  protected closeDeleteUserDialog(): void {
    this.showDeleteUserDialog.set(false);
    this.userToDelete.set(null);
    this.deleteUserError.set(null);
  }

  protected async deleteUser(): Promise<void> {
    const user = this.userToDelete();
    if (!user) return;

    this.isDeletingUser.set(true);
    this.deleteUserError.set(null);

    try {
      await this.usersService.deleteUser(user.id);
      
      // Remove the user from the local list
      const updatedUsers = this.allUsers().filter(u => u.id !== user.id);
      this.allUsers.set(updatedUsers);
      
      this.closeDeleteUserDialog();
    } catch (error: any) {
      this.deleteUserError.set(error.message || 'Failed to delete user');
    } finally {
      this.isDeletingUser.set(false);
    }
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

  protected sortUsers(field: SortField): void {
    if (this.userSortField() === field) {
      // Toggle direction if clicking the same field
      this.userSortDirection.set(this.userSortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      this.userSortField.set(field);
      this.userSortDirection.set('asc');
    }
  }

  protected getSortIcon(field: SortField): string {
    if (this.userSortField() !== field) {
      return '⇅'; // Both arrows when not sorted by this field
    }
    return this.userSortDirection() === 'asc' ? '↑' : '↓';
  }

  // Password validation methods
  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    
    // Update the signal for reactive UI
    this.newPasswordValue.set(value);
    
    if (!value) {
      return null; // Let required validator handle empty
    }

    const errors: ValidationErrors = {};

    if (value.length < 8) {
      errors['minLength'] = true;
    }
    if (!/[A-Z]/.test(value)) {
      errors['uppercase'] = true;
    }
    if (!/[a-z]/.test(value)) {
      errors['lowercase'] = true;
    }
    if (!/[0-9]/.test(value)) {
      errors['number'] = true;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
      errors['symbol'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const formGroup = control as FormGroup;
    const newPassword = formGroup.get('newPassword');
    const confirmPassword = formGroup.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else {
      const errors = confirmPassword?.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }
    
    return null;
  }

  // Change password dialog methods
  protected openChangePasswordDialog(): void {
    this.showUserMenu.set(false);
    this.showChangePasswordDialog.set(true);
    this.changePasswordForm.reset();
    this.changePasswordError.set(null);
    this.changePasswordSuccess.set(null);
    this.newPasswordValue.set('');
  }

  protected closeChangePasswordDialog(): void {
    this.showChangePasswordDialog.set(false);
    this.changePasswordForm.reset();
    this.changePasswordError.set(null);
    this.changePasswordSuccess.set(null);
    this.newPasswordValue.set('');
  }

  protected openPreferencesDialog(): void {
    this.showUserMenu.set(false);
    this.showPreferencesDialog.set(true);
  }

  protected closePreferencesDialog(): void {
    this.showPreferencesDialog.set(false);
  }

  protected openTestMessageDialog(): void {
    this.showUserMenu.set(false);
    this.showTestMessageDialog.set(true);
  }

  protected closeTestMessageDialog(): void {
    this.showTestMessageDialog.set(false);
  }

  protected openHelpDialog(): void {
    this.showHelpDialog.set(true);
  }

  protected closeHelpDialog(): void {
    this.showHelpDialog.set(false);
  }

  protected async onChangePassword(): Promise<void> {
    if (this.changePasswordForm.invalid) return;

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.changePasswordError.set('User not authenticated');
      return;
    }

    this.isChangingPassword.set(true);
    this.changePasswordError.set(null);
    this.changePasswordSuccess.set(null);

    try {
      const formValue = this.changePasswordForm.getRawValue();
      const result = await this.usersService.changePassword(
        userId,
        formValue.currentPassword,
        formValue.newPassword
      );

      this.changePasswordSuccess.set(result.message);
      this.changePasswordForm.reset();
      this.newPasswordValue.set('');

      // Auto-close after 2 seconds
      setTimeout(() => {
        this.closeChangePasswordDialog();
      }, 2000);
    } catch (error: any) {
      this.changePasswordError.set(error.error?.message || error.message || 'Failed to change password');
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  protected getPasswordFieldError(fieldName: string): string | null {
    const field = this.changePasswordForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'This field is required';
      }
      if (field.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
    }
    return null;
  }
}