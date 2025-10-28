# Per-User Per-Team Permissions Implementation Status

## Overview
Implementing a comprehensive permissions system that allows team administrators to control per-user per-team permissions for operations like sending messages and scheduling events.

## Completed Components

### 1. Database Layer ✅
- **Migration**: `1730135909000-AddUserPermissions.ts`
  - Created `user_permissions` table
  - Columns: id, user_id, team_id, permission, enabled, created_at, updated_at
  - Foreign keys to users and teams tables (CASCADE delete)
  - Unique index on (user_id, team_id, permission)

### 2. Backend Enums ✅
- **File**: `server/src/modules/teams/enums/team-permission.enum.ts`
  - `TeamPermission` enum with: SEND_MESSAGES, SCHEDULE_EVENTS
  - `TEAM_PERMISSION_LABELS` for display names
  - Extensible for future permissions

### 3. Backend Entities ✅
- **File**: `server/src/modules/teams/entities/user-permission.entity.ts`
  - UserPermission entity with proper relations
  - Links to User and Team entities
  - Indexed for performance

### 4. Backend DTOs ✅
- **File**: `server/src/modules/teams/dto/team-response.dto.ts`
  - `UserPermissionDto`: permission + enabled flag
  - `TeamMemberDto`: Added `permissions?: UserPermissionDto[]`
  - `UpdateMemberAttributesDto`: roles, isActive, permissions

### 5. Backend Service Methods ✅
- **File**: `server/src/modules/teams/teams.service.ts`
  - Injected `UserPermission` repository
  - Updated `transformToMemberDto` to accept permissions parameter
  - `updateMemberAttributes()`: Update roles, active status, and permissions
  - `getUserPermissions()`: Fetch permissions for a user/team
  - `hasPermission()`: Check if user has specific permission
  - `verifyTeamAdmin()`: Helper to verify admin access

### 6. Module Configuration ✅
- **File**: `server/src/modules/teams/teams.module.ts`
  - Added UserPermission to TypeOrmModule.forFeature

## Remaining Work

### 7. Backend Controller Endpoint ⏳
**File**: `server/src/modules/teams/teams.controller.ts`

Need to add:
```typescript
@Patch(':teamId/members/:userId/attributes')
@UseGuards(JwtAuthGuard)
async updateMemberAttributes(
  @Param('teamId') teamId: string,
  @Param('userId') userId: string,
  @Request() req,
  @Body() updateDto: UpdateMemberAttributesDto,
): Promise<TeamMemberDto> {
  return this.teamsService.updateMemberAttributes(
    teamId,
    userId,
    req.user.id,
    updateDto,
  );
}
```

### 8. Update getTeamMembers to Include Permissions ⏳
**File**: `server/src/modules/teams/teams.service.ts`

In the `getTeamMembers` method (around line 192-250), need to:
1. Fetch all permissions for the team after fetching members
2. Create a map of userId → permissions
3. Pass permissions to transformToMemberDto calls

Example:
```typescript
// After fetching lead positions
const allPermissions = await this.userPermissionRepository.find({
  where: { teamId },
});

const userPermissionsMap = new Map<string, UserPermissionDto[]>();
for (const perm of allPermissions) {
  if (!userPermissionsMap.has(perm.userId)) {
    userPermissionsMap.set(perm.userId, []);
  }
  userPermissionsMap.get(perm.userId).push({
    permission: perm.permission,
    enabled: perm.enabled,
  });
}

// Then in transformToMemberDto call:
this.transformToMemberDto(
  userTeam,
  userSubteamsMap.get(userTeam.userId),
  userLeadPositionsMap.get(userTeam.userId),
  userPermissionsMap.get(userTeam.userId)
)
```

### 9. Frontend TypeScript Interfaces ⏳
**File**: `frontend/src/app/dashboard/teams.service.ts`

Update TeamMember interface:
```typescript
export interface TeamMember {
  userId: string;
  teamId: string;
  roles: string[];
  status: 'pending' | 'active' | 'disabled';
  subteams?: string[];
  leadPositions?: Array<{ subteamName: string; positionTitle: string }>;
  permissions?: Array<{ permission: string; enabled: boolean }>; // ADD THIS
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
```

### 10. Frontend Edit Member Dialog ⏳
**File**: `frontend/src/app/dashboard/team-detail.component.ts`

Add signals:
```typescript
protected readonly showEditMemberDialog = signal(false);
protected readonly editingMember = signal<TeamMember | null>(null);
protected readonly memberEditRoles = signal<string[]>([]);
protected readonly memberEditIsActive = signal(true);
protected readonly memberEditPermissions = signal<Map<string, boolean>>(new Map());
protected readonly isSavingMemberAttributes = signal(false);
protected readonly memberEditError = signal<string | null>(null);
```

Add methods:
```typescript
protected openEditMemberDialog(member: TeamMember): void {
  this.editingMember.set(member);
  this.memberEditRoles.set([...member.roles]);
  this.memberEditIsActive.set(member.user?.isActive ?? true);
  
  // Initialize permissions map
  const permsMap = new Map<string, boolean>();
  permsMap.set('SEND_MESSAGES', false);
  permsMap.set('SCHEDULE_EVENTS', false);
  
  if (member.permissions) {
    member.permissions.forEach(p => {
      permsMap.set(p.permission, p.enabled);
    });
  }
  
  this.memberEditPermissions.set(permsMap);
  this.showEditMemberDialog.set(true);
}

protected async saveMemberAttributes(): Promise<void> {
  const member = this.editingMember();
  const teamId = this.team()?.id;
  if (!member || !teamId) return;

  this.isSavingMemberAttributes.set(true);
  this.memberEditError.set(null);

  try {
    const permissions = Array.from(this.memberEditPermissions().entries()).map(
      ([permission, enabled]) => ({ permission, enabled })
    );

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
```

### 11. Frontend Teams Service Method ⏳
**File**: `frontend/src/app/dashboard/teams.service.ts`

Add method:
```typescript
async updateMemberAttributes(
  teamId: string,
  userId: string,
  updateData: {
    roles?: string[];
    isActive?: boolean;
    permissions?: Array<{ permission: string; enabled: boolean }>;
  }
): Promise<TeamMember> {
  try {
    return await firstValueFrom(
      this.http.patch<TeamMember>(
        `${this.apiUrl}/${teamId}/members/${userId}/attributes`,
        updateData
      )
    );
  } catch (error: any) {
    console.error('Error updating member attributes:', error);
    throw new Error(error.error?.message || 'Failed to update member attributes');
  }
}
```

### 12. Frontend HTML Template ⏳
**File**: `frontend/src/app/dashboard/team-detail.component.html`

Remove inline role checkboxes and add Edit button in member list (around line 160-195):
```html
<div class="member-info">
  <div class="member-name">
    {{ member.user?.fullName || 'Unknown User' }}
    @if (member.user?.isActive === false) {
      <span class="disabled-badge">Disabled</span>
    }
  </div>
  @if (member.user?.primaryEmail) {
    <div class="member-email">{{ member.user?.primaryEmail }}</div>
  }
  @if (member.user?.primaryPhone) {
    <div class="member-phone">{{ member.user?.primaryPhone }}</div>
  }
  <div class="member-roles">
    @for (role of member.roles; track role) {
      <span class="role-tag">{{ role }}</span>
    }
    @if (member.subteams && member.subteams.length > 0) {
      @for (subteam of member.subteams; track subteam) {
        <span class="subteam-tag">{{ subteam }}</span>
      }
    }
    @if (member.leadPositions && member.leadPositions.length > 0) {
      @for (leadPos of member.leadPositions; track $index) {
        <span class="lead-position-tag">{{ leadPos.subteamName }} {{ leadPos.positionTitle }}</span>
      }
    }
  </div>
</div>
<div class="member-status">
  <span class="status-badge active">Active</span>
  @if (isTeamAdmin()) {
    <button 
      class="edit-member-button"
      (click)="openEditMemberDialog(member)">
      Edit
    </button>
  }
</div>
```

Add Edit Member Dialog (after other dialogs):
```html
@if (showEditMemberDialog() && editingMember()) {
  <div class="dialog-overlay" (click)="closeEditMemberDialog()">
    <div class="dialog-content edit-member-dialog" (click)="$event.stopPropagation()">
      <div class="dialog-header">
        <h2>Edit Member: {{ editingMember()!.user?.fullName }}</h2>
        <button class="close-button" (click)="closeEditMemberDialog()">×</button>
      </div>

      <div class="edit-member-content">
        <div class="form-group">
          <label for="memberRoles">Roles</label>
          <select 
            id="memberRoles"
            multiple
            [(ngModel)]="memberEditRoles"
            class="role-multiselect"
            size="6">
            @for (role of teamRoles(); track role) {
              <option [value]="role">{{ role }}</option>
            }
          </select>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input 
              type="checkbox"
              [(ngModel)]="memberEditIsActive"
            />
            User Account Active
          </label>
        </div>

        <div class="form-group">
          <label>Permissions</label>
          <div class="permissions-list">
            <div class="permission-item">
              <span>Send Messages</span>
              <label class="toggle-switch">
                <input 
                  type="checkbox"
                  [checked]="memberEditPermissions().get('SEND_MESSAGES')"
                  (change)="togglePermission('SEND_MESSAGES')"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="permission-item">
              <span>Schedule Events</span>
              <label class="toggle-switch">
                <input 
                  type="checkbox"
                  [checked]="memberEditPermissions().get('SCHEDULE_EVENTS')"
                  (change)="togglePermission('SCHEDULE_EVENTS')"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        @if (memberEditError()) {
          <div class="alert-error">
            {{ memberEditError() }}
          </div>
        }

        <div class="dialog-actions">
          <button 
            class="cancel-button"
            (click)="closeEditMemberDialog()"
            [disabled]="isSavingMemberAttributes()">
            Cancel
          </button>
          <button 
            class="save-button"
            (click)="saveMemberAttributes()"
            [disabled]="isSavingMemberAttributes()">
            {{ isSavingMemberAttributes() ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
}
```

### 13. Frontend CSS Styling ⏳
**File**: `frontend/src/app/dashboard/team-detail.component.scss`

Add styles for toggle switches and edit button:
```scss
.edit-member-button {
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: #5568d3;
  }
}

.edit-member-dialog {
  min-width: 600px;
  max-width: 700px;
}

.edit-member-content {
  padding: 2rem;
}

.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.permission-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;

  span {
    font-weight: 500;
    color: #374151;
  }
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .toggle-slider {
      background-color: #667eea;
    }

    &:checked + .toggle-slider:before {
      transform: translateX(26px);
    }
  }
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }
}
```

### 14. Calendar Permission Check ⏳
**File**: `frontend/src/app/dashboard/calendar/calendar.component.ts`

Update to check SCHEDULE_EVENTS permission:
```typescript
protected readonly canScheduleEvents = computed(() => {
  const team = this.team();
  const currentUser = this.authService.currentUser();
  if (!team || !currentUser) return false;

  const member = this.members().find(m => m.userId === currentUser.id);
  if (!member) return false;

  // Check if user has SCHEDULE_EVENTS permission
  const permission = member.permissions?.find(p => p.permission === 'SCHEDULE_EVENTS');
  return permission?.enabled ?? false;
});
```

Update template to disable Add Event button:
```html
<button 
  class="add-event-button"
  (click)="openAddEventDialog()"
  [disabled]="!canScheduleEvents()">
  Add Event
</button>
```

### 15. Run Migration ⏳
```bash
cd server
npm run build
# Then restart server - migration will run automatically
```

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Can assign/remove permissions for team members
- [ ] Can update member roles via dialog
- [ ] Can enable/disable user accounts via dialog
- [ ] Only users with SCHEDULE_EVENTS can add calendar events
- [ ] Permissions persist across page refreshes
- [ ] Non-admin users cannot edit member attributes
- [ ] Administrator role always shows in role multiselect

## Next Steps

1. Complete backend controller endpoint (#7)
2. Update getTeamMembers to fetch permissions (#8)
3. Add frontend TypeScript interfaces and service method (#9-11)
4. Create Edit Member dialog UI (#12-13)
5. Add calendar permission checks (#14)
6. Run migration and test (#15)
