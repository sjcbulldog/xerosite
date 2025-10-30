import { Component, inject, ChangeDetectionStrategy, signal, OnInit, computed, ViewChild } from '@angular/core';
import { TeamsService, Team, TeamMember, TeamInvitation } from './teams.service';
import { Subteam, CreateSubteamRequest } from './subteam.types';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../profile/users.service';
import { CalendarService } from './calendar.service';
import { TeamEvent } from './calendar.types';
import { CalendarComponent } from './calendar.component';
import { EventAttendanceReportComponent } from './event-attendance-report.component';
import { UserGroupsManagerComponent } from './user-groups-manager.component';
import { ExportUsersDialogComponent } from './export-users-dialog.component';
import { SendMessageDialogComponent } from './send-message-dialog.component';
import { ReviewMessagesDialogComponent } from './review-messages-dialog.component';
import { COMMON_TIMEZONES } from './timezones';

@Component({
  selector: 'app-team-detail',
  imports: [TitleCasePipe, DatePipe, FormsModule, CalendarComponent, EventAttendanceReportComponent, UserGroupsManagerComponent, ExportUsersDialogComponent, SendMessageDialogComponent, ReviewMessagesDialogComponent],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamDetailComponent implements OnInit {
  protected readonly teamsService = inject(TeamsService);
  protected readonly authService = inject(AuthService);
  protected readonly usersService = inject(UsersService);
  protected readonly calendarService = inject(CalendarService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Expose Object for template use
  protected readonly Object = Object;
  
  // Expose timezones for template use
  protected readonly COMMON_TIMEZONES = COMMON_TIMEZONES;

  protected readonly team = signal<Team | null>(null);
  protected readonly members = signal<TeamMember[]>([]);
  protected readonly pendingMembers = signal<TeamMember[]>([]);
  protected readonly activeMembers = signal<TeamMember[]>([]);
  protected readonly isLoadingMembers = signal(false);
  protected readonly showPendingMembers = signal(false);
  protected readonly showActiveMembers = signal(false);
  
  // Member filter
  protected readonly memberFilter = signal('');
  
  // Filtered members based on search text
  protected readonly filteredActiveMembers = computed(() => {
    const filter = this.memberFilter().toLowerCase().trim();
    if (!filter) {
      return this.activeMembers();
    }
    
    return this.activeMembers().filter(member => {
      const fullName = member.user?.fullName?.toLowerCase() || '';
      const firstName = member.user?.firstName?.toLowerCase() || '';
      const lastName = member.user?.lastName?.toLowerCase() || '';
      const email = member.user?.primaryEmail?.toLowerCase() || '';
      
      return fullName.includes(filter) || 
             firstName.includes(filter) || 
             lastName.includes(filter) || 
             email.includes(filter);
    });
  });
  
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
  
  // Constraints editor signals
  protected readonly showConstraintsEditor = signal(false);
  protected readonly editingConstraints = signal<Array<[string, string]>>([]);
  protected readonly constraintRole1 = signal('');
  protected readonly constraintRole2 = signal('');
  protected readonly isSavingConstraints = signal(false);
  protected readonly constraintsEditorError = signal<string | null>(null);
  
  // Description editor signals
  protected readonly showDescriptionEditor = signal(false);
  protected readonly editingDescription = signal('');
  protected readonly editingVisibility = signal<'public' | 'private'>('private');
  protected readonly editingTimezone = signal('America/New_York');
  protected readonly isSavingDescription = signal(false);
  protected readonly descriptionEditorError = signal<string | null>(null);
  
  // Admin menu signals
  protected readonly showAdminMenu = signal(false);
  
  // Import roster signals
  protected readonly showImportDialog = signal(false);
  protected readonly importFile = signal<File | null>(null);
  protected readonly importStatus = signal<'pending' | 'active'>('pending');
  protected readonly importDefaultPassword = signal('');
  protected readonly isImporting = signal(false);
  protected readonly importProgress = signal(0);
  protected readonly importTotal = signal(0);
  protected readonly importError = signal<string | null>(null);
  protected readonly importResult = signal<any | null>(null);
  protected readonly isDragging = signal(false);
  
  // Edit Member dialog signals
  protected readonly showEditMemberDialog = signal(false);
  protected readonly editingMember = signal<TeamMember | null>(null);
  protected readonly memberEditRoles = signal<string[]>([]);
  protected readonly memberEditIsActive = signal(true);
  protected readonly memberEditPermissions = signal<Map<string, boolean>>(new Map());
  protected readonly isSavingMemberAttributes = signal(false);
  protected readonly memberEditError = signal<string | null>(null);
  
  // Computed to check if the editing member is an administrator
  protected readonly isEditingMemberAdmin = computed(() => {
    const roles = this.memberEditRoles();
    return roles.includes('Administrator');
  });
  
  // Subteam signals
  protected readonly subteams = signal<Subteam[]>([]);
  protected readonly isLoadingSubteams = signal(false);
  protected readonly showSubteamsSection = signal(false);
  protected readonly showCreateSubteamDialog = signal(false);
  protected readonly showEditSubteamDialog = signal(false);
  protected readonly showManageMembersDialog = signal(false);
  protected readonly selectedSubteam = signal<Subteam | null>(null);
  protected readonly showSubteamDetailDialog = signal(false);
  protected readonly selectedSubteamForDetail = signal<Subteam | null>(null);
  
  // Calendar signals
  protected readonly showCalendarSection = signal(false);
  protected readonly calendarEvents = signal<TeamEvent[]>([]);
  
  // User Groups signals
  protected readonly showUserGroupsManager = signal(false);
  
  // Export Users dialog signal
  protected readonly showExportDialog = signal(false);
  
  // Send Message dialog signal
  protected readonly showSendMessageDialog = signal(false);
  
  // Review Messages dialog signal
  protected readonly showReviewMessagesDialog = signal(false);
  
  // Create/Edit Subteam form
  protected readonly subteamName = signal('');
  protected readonly subteamDescription = signal('');
  protected readonly subteamValidRoles = signal<string[]>([]);
  protected readonly subteamLeadPositions = signal<Array<{title: string, requiredRole: string}>>([]);
  protected readonly newLeadTitle = signal('');
  protected readonly newLeadRole = signal('');
  protected readonly isSavingSubteam = signal(false);
  protected readonly subteamError = signal<string | null>(null);
  
  // Member management
  protected readonly memberRoleFilter = signal<string>(''); // Empty string means "All Roles"
  protected readonly availableTeamMembers = computed(() => {
    const subteam = this.selectedSubteam();
    if (!subteam) return [];
    
    const subteamMemberIds = new Set(subteam.members.map(m => m.userId));
    const roleFilter = this.memberRoleFilter();
    
    let availableMembers = this.activeMembers().filter(m => !subteamMemberIds.has(m.userId));
    
    // Apply role filter if one is selected
    if (roleFilter) {
      availableMembers = availableMembers.filter(m => m.roles.includes(roleFilter));
    }
    
    return availableMembers;
  });
  protected readonly selectedMemberIds = signal<Set<string>>(new Set());
  protected readonly isUpdatingMembers = signal(false);
  
  // Computed signal to check if current user is admin of this team
  protected readonly isTeamAdmin = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;
    
    const allMembers = this.members();
    const userMembership = allMembers.find(m => m.userId === currentUserId);

    // Allow either a team-level Administrator role OR a site-wide administrator
    const isTeamAdministrator = userMembership?.roles.includes('Administrator') || false;
    const isSiteAdministrator = this.authService.currentUser()?.isSiteAdmin || false;

    return isTeamAdministrator || isSiteAdministrator;
  });

  // Computed signal to check if current user can send messages
  protected readonly canSendMessages = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;
    
    const allMembers = this.members();
    const userMembership = allMembers.find(m => m.userId === currentUserId);
    
    if (!userMembership || userMembership.status !== 'active') return false;

    // Administrators always have permission
    const isTeamAdministrator = userMembership.roles.includes('Administrator') || false;
    const isSiteAdministrator = this.authService.currentUser()?.isSiteAdmin || false;
    
    if (isTeamAdministrator || isSiteAdministrator) return true;

    // Check if user has SEND_MESSAGES permission
    const sendMessagesPermission = userMembership.permissions?.find(p => p.permission === 'SEND_MESSAGES');
    return sendMessagesPermission?.enabled || false;
  });

  // Computed signal to group subteam members by role for detail view
  protected readonly subteamMembersGroupedByRole = computed(() => {
    const subteam = this.selectedSubteamForDetail();
    if (!subteam) return {};
    
    const teamMembers = this.activeMembers();
    const grouped: { [role: string]: Array<{ userId: string; userName: string; userEmail: string; roles: string[] }> } = {};
    
    // Group subteam members by their roles from the parent team
    subteam.members.forEach(subteamMember => {
      // Find the corresponding team member to get their roles
      const teamMember = teamMembers.find(tm => tm.userId === subteamMember.userId);
      if (!teamMember) return;
      
      teamMember.roles.forEach((role: string) => {
        if (!grouped[role]) {
          grouped[role] = [];
        }
        // Add member to this role group if not already there
        if (!grouped[role].some(m => m.userId === subteamMember.userId)) {
          grouped[role].push({
            userId: subteamMember.userId,
            userName: subteamMember.userName,
            userEmail: subteamMember.userEmail,
            roles: teamMember.roles
          });
        }
      });
    });
    
    return grouped;
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

    // Listen for export dialog close event
    window.addEventListener('closeExportUsersDialog', () => {
      this.closeExportDialog();
    });

    // Listen for set team ID event from parent
    window.addEventListener('setExportTeamId', ((event: CustomEvent) => {
      // This will be handled by the export dialog component directly
    }) as EventListener);
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
      
      // Load subteams for count display
      await this.loadSubteams();
      
      // Load calendar events for attendance report
      await this.loadCalendarEvents(teamId);
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

  protected toggleAdminMenu(): void {
    this.showAdminMenu.set(!this.showAdminMenu());
  }

  protected closeAdminMenu(): void {
    this.showAdminMenu.set(false);
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
    if (!team?.roleConstraints) {
      return [];
    }
    
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
    this.closeAdminMenu();
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
    this.closeAdminMenu();
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

  // Send Message Dialog Methods
  protected openSendMessageDialog(): void {
    this.closeAdminMenu();
    this.showSendMessageDialog.set(true);
  }

  protected closeSendMessageDialog(): void {
    this.showSendMessageDialog.set(false);
  }

  protected onMessageSent(): void {
    // Optionally reload team data or show confirmation
    console.log('Message sent successfully');
  }

  // Review Messages Dialog Methods
  protected openReviewMessagesDialog(): void {
    this.closeAdminMenu();
    this.showReviewMessagesDialog.set(true);
  }

  protected closeReviewMessagesDialog(): void {
    this.showReviewMessagesDialog.set(false);
  }

  // Edit Member Dialog Methods
  protected openEditMemberDialog(member: TeamMember): void {
    this.editingMember.set(member);
    this.memberEditRoles.set([...member.roles]);
    this.memberEditIsActive.set(member.user?.isActive ?? true);
    
    // Initialize permissions map
    const permsMap = new Map<string, boolean>();
    
    // If user is an administrator, set all permissions to true
    if (member.roles.includes('Administrator')) {
      permsMap.set('SEND_MESSAGES', true);
      permsMap.set('SCHEDULE_EVENTS', true);
      permsMap.set('CREATE_PUBLIC_USER_GROUPS', true);
    } else {
      // For non-admins, initialize from database
      permsMap.set('SEND_MESSAGES', false);
      permsMap.set('SCHEDULE_EVENTS', false);
      permsMap.set('CREATE_PUBLIC_USER_GROUPS', false);
      
      if (member.permissions) {
        member.permissions.forEach(p => {
          permsMap.set(p.permission, p.enabled);
        });
      }
    }
    
    this.memberEditPermissions.set(permsMap);
    this.memberEditError.set(null);
    this.showEditMemberDialog.set(true);
  }

  protected closeEditMemberDialog(): void {
    this.showEditMemberDialog.set(false);
    this.editingMember.set(null);
    this.memberEditRoles.set([]);
    this.memberEditIsActive.set(true);
    this.memberEditPermissions.set(new Map());
    this.memberEditError.set(null);
  }

  protected togglePermission(permission: string): void {
    // Don't allow toggling if the edited member is an administrator
    const roles = this.memberEditRoles();
    if (roles.includes('Administrator')) {
      return; // Administrators always have all permissions
    }

    const currentPerms = this.memberEditPermissions();
    const newPerms = new Map(currentPerms);
    newPerms.set(permission, !currentPerms.get(permission));
    this.memberEditPermissions.set(newPerms);
  }

  protected toggleEditDialogRole(role: string): void {
    const currentRoles = this.memberEditRoles();
    
    if (currentRoles.includes(role)) {
      // Removing a role - just remove it
      this.memberEditRoles.set(currentRoles.filter(r => r !== role));
    } else {
      // Adding a role - check for ALL constraints and remove any conflicting roles
      const conflictingRoles = this.getConflictingRoles(role);
      
      // Start with current roles, but filter out any that conflict with the new role
      const newRoles = currentRoles.filter(r => !conflictingRoles.includes(r));
      
      // Add the new role
      newRoles.push(role);
      
      // Update the signal with the new roles array
      this.memberEditRoles.set(newRoles);
    }

    // If Administrator role is being added or removed, update permissions accordingly
    const updatedRoles = this.memberEditRoles();
    if (updatedRoles.includes('Administrator')) {
      // Set all permissions to enabled for administrators
      const permsMap = new Map<string, boolean>();
      permsMap.set('SEND_MESSAGES', true);
      permsMap.set('SCHEDULE_EVENTS', true);
      permsMap.set('CREATE_PUBLIC_USER_GROUPS', true);
      this.memberEditPermissions.set(permsMap);
    }
  }

  protected async saveMemberAttributes(): Promise<void> {
    const member = this.editingMember();
    const teamId = this.team()?.id;
    if (!member || !teamId) return;

    this.isSavingMemberAttributes.set(true);
    this.memberEditError.set(null);

    try {
      // Build permissions array
      let permissions = Array.from(this.memberEditPermissions().entries()).map(
        ([permission, enabled]) => ({ permission: permission as 'SEND_MESSAGES' | 'SCHEDULE_EVENTS', enabled })
      );

      // If user is an administrator, ensure all permissions are enabled
      if (this.memberEditRoles().includes('Administrator')) {
        permissions = [
          { permission: 'SEND_MESSAGES' as const, enabled: true },
          { permission: 'SCHEDULE_EVENTS' as const, enabled: true }
        ];
      }

      const updateData = {
        roles: this.memberEditRoles(),
        isActive: this.memberEditIsActive(),
        permissions,
      };

      await this.teamsService.updateMemberAttributes(teamId, member.userId, updateData);
      await this.loadTeamDetails(teamId);
      this.closeEditMemberDialog();
    } catch (error: any) {
      this.memberEditError.set(error.message || 'Failed to update member');
    } finally {
      this.isSavingMemberAttributes.set(false);
    }
  }

  // Constraints Editor Methods
  protected async openConstraintsEditor(): Promise<void> {
    this.closeAdminMenu();
    const teamId = this.team()?.id;
    if (!teamId) return;

    try {
      const constraints = await this.teamsService.getRoleConstraints(teamId);
      this.editingConstraints.set(constraints);
      this.constraintRole1.set('');
      this.constraintRole2.set('');
      this.constraintsEditorError.set(null);
      this.showConstraintsEditor.set(true);
    } catch (error: any) {
      console.error('Failed to load constraints:', error);
      this.constraintsEditorError.set('Failed to load constraints');
    }
  }

  protected closeConstraintsEditor(): void {
    this.showConstraintsEditor.set(false);
    this.constraintRole1.set('');
    this.constraintRole2.set('');
    this.constraintsEditorError.set(null);
  }

  protected addConstraint(): void {
    const role1 = this.constraintRole1().trim();
    const role2 = this.constraintRole2().trim();

    if (!role1 || !role2) {
      this.constraintsEditorError.set('Both roles must be selected');
      return;
    }

    if (role1 === role2) {
      this.constraintsEditorError.set('Cannot create constraint with the same role');
      return;
    }

    // Check if constraint already exists (in either direction)
    const constraints = this.editingConstraints();
    const exists = constraints.some(
      ([r1, r2]) => (r1 === role1 && r2 === role2) || (r1 === role2 && r2 === role1)
    );

    if (exists) {
      this.constraintsEditorError.set('This constraint already exists');
      return;
    }

    // Add the new constraint
    this.editingConstraints.set([...constraints, [role1, role2]]);
    this.constraintRole1.set('');
    this.constraintRole2.set('');
    this.constraintsEditorError.set(null);
  }

  protected removeConstraint(index: number): void {
    const constraints = [...this.editingConstraints()];
    constraints.splice(index, 1);
    this.editingConstraints.set(constraints);
  }

  protected async saveConstraints(): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    this.isSavingConstraints.set(true);
    this.constraintsEditorError.set(null);

    try {
      await this.teamsService.updateRoleConstraints(teamId, this.editingConstraints());
      
      // Reload team details to get updated constraints
      await this.loadTeamDetails(teamId);
      
      this.closeConstraintsEditor();
    } catch (error: any) {
      this.constraintsEditorError.set(error.message || 'Failed to save constraints');
    } finally {
      this.isSavingConstraints.set(false);
    }
  }

  // Description Editor Methods
  protected openDescriptionEditor(): void {
    this.closeAdminMenu();
    const currentDescription = this.team()?.description || '';
    const currentVisibility = this.team()?.visibility || 'private';
    const currentTimezone = this.team()?.timezone || 'America/New_York';
    this.editingDescription.set(currentDescription);
    this.editingVisibility.set(currentVisibility);
    this.editingTimezone.set(currentTimezone);
    this.descriptionEditorError.set(null);
    this.showDescriptionEditor.set(true);
  }

  protected closeDescriptionEditor(): void {
    this.showDescriptionEditor.set(false);
    this.editingDescription.set('');
    this.editingVisibility.set('private');
    this.editingTimezone.set('America/New_York');
    this.descriptionEditorError.set(null);
  }

  protected async saveDescription(): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    const description = this.editingDescription().trim();
    const visibility = this.editingVisibility();
    const timezone = this.editingTimezone();

    this.isSavingDescription.set(true);
    this.descriptionEditorError.set(null);

    try {
      await this.teamsService.updateTeam(teamId, { description, visibility, timezone });
      
      // Update local team state
      const currentTeam = this.team();
      if (currentTeam) {
        this.team.set({ ...currentTeam, description, visibility, timezone });
      }
      
      this.closeDescriptionEditor();
    } catch (error: any) {
      this.descriptionEditorError.set(error.message || 'Failed to save description');
    } finally {
      this.isSavingDescription.set(false);
    }
  }

  // Import Roster Methods
  protected openImportDialog(): void {
    this.closeAdminMenu();
    this.importFile.set(null);
    this.importStatus.set('pending');
    this.importDefaultPassword.set('');
    this.importProgress.set(0);
    this.importTotal.set(0);
    this.importError.set(null);
    this.importResult.set(null);
    this.showImportDialog.set(true);
  }

  protected closeImportDialog(): void {
    this.showImportDialog.set(false);
    this.importFile.set(null);
    this.importDefaultPassword.set('');
    this.importProgress.set(0);
    this.importTotal.set(0);
    this.importError.set(null);
    this.importResult.set(null);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        this.importFile.set(file);
        this.importError.set(null);
      } else {
        this.importError.set('Please select a CSV file');
      }
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        this.importFile.set(file);
        this.importError.set(null);
      } else {
        this.importError.set('Please select a CSV file');
      }
    }
  }

  protected async importRoster(): Promise<void> {
    const file = this.importFile();
    const teamId = this.team()?.id;

    if (!file || !teamId) return;

    this.isImporting.set(true);
    this.importError.set(null);
    this.importResult.set(null);
    this.importProgress.set(0);

    try {
      // Parse CSV file
      this.importProgress.set(10);
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
      }

      this.importProgress.set(20);

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Map column names to indices
      const columnMap: any = {};
      const requiredColumns = ['first', 'last', 'email'];
      const optionalColumns = ['address', 'city', 'state', 'zip', 'phone number'];

      header.forEach((col, index) => {
        const normalizedCol = col.replace(/['"]/g, '').toLowerCase();
        if (requiredColumns.includes(normalizedCol) || optionalColumns.includes(normalizedCol)) {
          if (normalizedCol === 'phone number') {
            columnMap['phoneNumber'] = index;
          } else {
            columnMap[normalizedCol] = index;
          }
        }
      });

      // Validate required columns
      for (const required of requiredColumns) {
        if (columnMap[required] === undefined) {
          throw new Error(`Missing required column: ${required}`);
        }
      }

      this.importProgress.set(30);

      // Parse data rows
      const members = [];
      const totalRows = lines.length - 1; // Exclude header
      this.importTotal.set(totalRows);

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        
        const member: any = {
          first: values[columnMap['first']],
          last: values[columnMap['last']],
          email: values[columnMap['email']],
        };

        if (columnMap['address'] !== undefined) member.address = values[columnMap['address']];
        if (columnMap['city'] !== undefined) member.city = values[columnMap['city']];
        if (columnMap['state'] !== undefined) member.state = values[columnMap['state']];
        if (columnMap['zip'] !== undefined) member.zip = values[columnMap['zip']];
        if (columnMap['phoneNumber'] !== undefined) member.phoneNumber = values[columnMap['phoneNumber']];

        members.push(member);

        // Update progress for parsing (30-50%)
        const parseProgress = 30 + Math.floor((i / lines.length) * 20);
        this.importProgress.set(parseProgress);
      }

      // Send to server
      this.importProgress.set(50);
      const defaultPassword = this.importDefaultPassword().trim() || undefined;
      const defaultStatus = this.importStatus();
      
      // Simulate incremental progress while server processes
      // Target: ~25 seconds from 50% to 95% (allowing ~5 seconds for initial parsing and final completion)
      // 45% progress over 25 seconds = ~1.8% per second
      const progressInterval = setInterval(() => {
        const current = this.importProgress();
        if (current < 95) {
          this.importProgress.set(Math.min(current + 0.9, 95));
        }
      }, 500); // Update every 500ms

      const result = await this.teamsService.importRoster(teamId, members, defaultPassword, defaultStatus);
      
      clearInterval(progressInterval);
      this.importProgress.set(100);
      this.importResult.set(result);

      // Reload team members
      await this.loadTeamDetails(teamId);
    } catch (error: any) {
      this.importError.set(error.message || 'Failed to import roster');
    } finally {
      this.isImporting.set(false);
    }
  }

  // Subteam management methods
  protected async toggleSubteamsSection(): Promise<void> {
    const newState = !this.showSubteamsSection();
    this.showSubteamsSection.set(newState);
    
    if (newState && this.subteams().length === 0) {
      await this.loadSubteams();
    }
  }

  // Calendar management methods
  protected toggleCalendarSection(): void {
    this.showCalendarSection.set(!this.showCalendarSection());
  }

  private async loadSubteams(): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    this.isLoadingSubteams.set(true);
    try {
      const subteams = await this.teamsService.getTeamSubteams(teamId);
      this.subteams.set(subteams);
    } catch (error: any) {
      console.error('Error loading subteams:', error);
    } finally {
      this.isLoadingSubteams.set(false);
    }
  }

  private async loadCalendarEvents(teamId: string): Promise<void> {
    try {
      const events = await this.calendarService.getEventsForTeam(teamId);
      this.calendarEvents.set(events);
    } catch (error: any) {
      console.error('Error loading calendar events:', error);
      this.calendarEvents.set([]);
    }
  }

  protected openCreateSubteamDialog(): void {
    this.subteamName.set('');
    this.subteamDescription.set('');
    this.subteamValidRoles.set([]);
    this.subteamLeadPositions.set([]);
    this.subteamError.set(null);
    this.showCreateSubteamDialog.set(true);
  }

  protected closeCreateSubteamDialog(): void {
    this.showCreateSubteamDialog.set(false);
  }

  protected openEditSubteamDialog(subteam: Subteam): void {
    this.selectedSubteam.set(subteam);
    this.subteamName.set(subteam.name);
    this.subteamDescription.set(subteam.description || '');
    this.subteamValidRoles.set([...subteam.validRoles]);
    this.subteamLeadPositions.set([]); // Clear any new positions - existing positions are in selectedSubteam
    this.subteamError.set(null);
    this.showEditSubteamDialog.set(true);
  }

  protected closeEditSubteamDialog(): void {
    this.showEditSubteamDialog.set(false);
    this.selectedSubteam.set(null);
  }

  protected addLeadPosition(): void {
    const title = this.newLeadTitle().trim();
    const role = this.newLeadRole();
    
    if (title && role) {
      this.subteamLeadPositions.set([...this.subteamLeadPositions(), { title, requiredRole: role }]);
      this.newLeadTitle.set('');
      this.newLeadRole.set('');
    }
  }

  protected removeLeadPosition(index: number): void {
    const positions = this.subteamLeadPositions();
    this.subteamLeadPositions.set(positions.filter((_, i) => i !== index));
  }

  protected async removeExistingLeadPosition(subteam: Subteam, positionId: string): Promise<void> {
    if (!confirm('Are you sure you want to remove this lead position?')) {
      return;
    }

    const teamId = this.team()?.id;
    if (!teamId) return;

    try {
      await this.teamsService.deleteLeadPosition(teamId, subteam.id, positionId);
      await this.loadSubteams();
      
      // Update selectedSubteam with the fresh data
      const updatedSubteams = this.subteams();
      const updatedSubteam = updatedSubteams.find(s => s.id === subteam.id);
      if (updatedSubteam) {
        this.selectedSubteam.set(updatedSubteam);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to remove lead position');
    }
  }

  protected async createSubteam(): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    if (!this.subteamName().trim()) {
      this.subteamError.set('Subteam name is required');
      return;
    }

    if (this.subteamValidRoles().length === 0) {
      this.subteamError.set('At least one valid role must be selected');
      return;
    }

    this.isSavingSubteam.set(true);
    this.subteamError.set(null);

    try {
      const request: CreateSubteamRequest = {
        name: this.subteamName().trim(),
        description: this.subteamDescription().trim() || undefined,
        validRoles: this.subteamValidRoles(),
        leadPositions: this.subteamLeadPositions().length > 0 ? this.subteamLeadPositions() : undefined
      };

      await this.teamsService.createSubteam(teamId, request);
      await this.loadSubteams();
      this.closeCreateSubteamDialog();
    } catch (error: any) {
      this.subteamError.set(error.message || 'Failed to create subteam');
    } finally {
      this.isSavingSubteam.set(false);
    }
  }

  protected async updateSubteam(): Promise<void> {
    const teamId = this.team()?.id;
    const subteam = this.selectedSubteam();
    if (!teamId || !subteam) return;

    if (!this.subteamName().trim()) {
      this.subteamError.set('Subteam name is required');
      return;
    }

    if (this.subteamValidRoles().length === 0) {
      this.subteamError.set('At least one valid role must be selected');
      return;
    }

    this.isSavingSubteam.set(true);
    this.subteamError.set(null);

    try {
      // Update basic subteam properties (name, description, validRoles)
      await this.teamsService.updateSubteam(teamId, subteam.id, {
        name: this.subteamName().trim(),
        description: this.subteamDescription().trim() || undefined,
        validRoles: this.subteamValidRoles(),
        // Include ALL positions (existing + new) to preserve assignments
        leadPositions: [
          ...subteam.leadPositions.map(p => ({
            title: p.title,
            requiredRole: p.requiredRole,
            userId: p.userId || undefined
          })),
          ...this.subteamLeadPositions()
        ]
      });

      await this.loadSubteams();
      this.closeEditSubteamDialog();
    } catch (error: any) {
      this.subteamError.set(error.message || 'Failed to update subteam');
    } finally {
      this.isSavingSubteam.set(false);
    }
  }

  protected async deleteSubteam(subteam: Subteam): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    if (!confirm(`Are you sure you want to delete the subteam "${subteam.name}"? This will remove all members and lead assignments.`)) {
      return;
    }

    try {
      await this.teamsService.deleteSubteam(teamId, subteam.id);
      await this.loadSubteams();
    } catch (error: any) {
      alert(error.message || 'Failed to delete subteam');
    }
  }

  protected openManageMembersDialog(subteam: Subteam): void {
    this.selectedSubteam.set(subteam);
    this.selectedMemberIds.set(new Set());
    this.memberRoleFilter.set(''); // Reset role filter
    this.showManageMembersDialog.set(true);
  }

  protected closeManageMembersDialog(): void {
    this.showManageMembersDialog.set(false);
    this.selectedSubteam.set(null);
    this.selectedMemberIds.set(new Set());
    this.memberRoleFilter.set(''); // Reset role filter
  }

  protected openSubteamDetailDialog(subteam: Subteam): void {
    this.selectedSubteamForDetail.set(subteam);
    this.showSubteamDetailDialog.set(true);
  }

  protected closeSubteamDetailDialog(): void {
    this.showSubteamDetailDialog.set(false);
    this.selectedSubteamForDetail.set(null);
  }

  protected toggleMemberSelection(userId: string): void {
    const selected = this.selectedMemberIds();
    const newSelected = new Set(selected);
    
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    
    this.selectedMemberIds.set(newSelected);
  }

  protected async addSelectedMembers(): Promise<void> {
    const teamId = this.team()?.id;
    const subteam = this.selectedSubteam();
    if (!teamId || !subteam) return;

    const userIds = Array.from(this.selectedMemberIds());
    if (userIds.length === 0) return;

    this.isUpdatingMembers.set(true);
    try {
      await this.teamsService.addSubteamMembers(teamId, subteam.id, userIds);
      await this.loadSubteams();
      this.selectedMemberIds.set(new Set());
      
      // Update selected subteam
      const updatedSubteams = this.subteams();
      const updated = updatedSubteams.find(s => s.id === subteam.id);
      if (updated) {
        this.selectedSubteam.set(updated);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add members');
    } finally {
      this.isUpdatingMembers.set(false);
    }
  }

  protected async removeMember(subteam: Subteam, userId: string): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    if (!confirm('Are you sure you want to remove this member from the subteam?')) {
      return;
    }

    try {
      await this.teamsService.removeSubteamMember(teamId, subteam.id, userId);
      await this.loadSubteams();
      
      // Update selected subteam if in manage dialog
      if (this.showManageMembersDialog()) {
        const updatedSubteams = this.subteams();
        const updated = updatedSubteams.find(s => s.id === subteam.id);
        if (updated) {
          this.selectedSubteam.set(updated);
        }
      }
    } catch (error: any) {
      alert(error.message || 'Failed to remove member');
    }
  }

  protected async assignLeadPosition(subteam: Subteam, positionId: string, userId: string | null): Promise<void> {
    const teamId = this.team()?.id;
    if (!teamId) return;

    try {
      await this.teamsService.updateLeadPosition(teamId, subteam.id, positionId, userId || undefined);
      await this.loadSubteams();
      
      // Update selectedSubteam with the fresh data to preserve assignments
      const updatedSubteams = this.subteams();
      const updatedSubteam = updatedSubteams.find(s => s.id === subteam.id);
      if (updatedSubteam) {
        this.selectedSubteam.set(updatedSubteam);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update lead position');
    }
  }

  protected getEligibleLeads(subteam: Subteam, requiredRole: string): TeamMember[] {
    // Get the set of user IDs who are members of this subteam
    const subteamMemberIds = new Set(subteam.members.map(m => m.userId));
    
    // Filter to users who have the required role AND are members of the subteam
    return this.activeMembers().filter(m => 
      m.roles.includes(requiredRole) && subteamMemberIds.has(m.userId)
    );
  }

  // User Groups Methods
  protected openUserGroupsManager(): void {
    this.closeAdminMenu();
    this.showUserGroupsManager.set(true);
  }

  protected closeUserGroupsManager(): void {
    this.showUserGroupsManager.set(false);
  }

  protected openExportDialog(): void {
    this.closeAdminMenu();
    this.showExportDialog.set(true);
    
    // Set the team ID on the export dialog after a brief delay to ensure component is rendered
    setTimeout(() => {
      const exportDialogEvent = new CustomEvent('setExportTeamId', { 
        detail: { teamId: this.team()?.id } 
      });
      window.dispatchEvent(exportDialogEvent);
    }, 0);
  }

  protected closeExportDialog(): void {
    this.showExportDialog.set(false);
  }

  // Computed permission check for user groups
  protected readonly canCreateUserGroups = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;

    const allMembers = this.members();
    const userMembership = allMembers.find(m => m.userId === currentUserId);

    if (!userMembership) return false;

    // Admins can always create groups
    if (userMembership.roles.includes('Administrator')) return true;

    // Check for SCHEDULE_EVENTS or SEND_MESSAGES permissions
    const permissions = userMembership.permissions || [];
    return permissions.some(p => 
      (p.permission === 'SCHEDULE_EVENTS' || p.permission === 'SEND_MESSAGES') && p.enabled
    );
  });

  protected readonly canCreatePublicGroups = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;

    const allMembers = this.members();
    const userMembership = allMembers.find(m => m.userId === currentUserId);

    if (!userMembership) return false;

    // Admins can always create public groups
    if (userMembership.roles.includes('Administrator')) return true;

    // Check for CREATE_PUBLIC_USER_GROUPS permission
    const permissions = userMembership.permissions || [];
    return permissions.some(p => 
      (p.permission as string) === 'CREATE_PUBLIC_USER_GROUPS' && p.enabled
    );
  });
}
