# All Teams Section for Site Administrators

## Overview
Added a collapsible "All Teams" section on the dashboard that displays all teams in the system. This section is only visible to site administrators.

## Changes Made

### Backend Changes

#### `server/src/modules/teams/teams.controller.ts`
- Added new endpoint `GET /teams/admin/all`
- Checks `user.isSiteAdmin` before returning data
- Returns all teams using existing `teamsService.findAll()` method

```typescript
@Get('admin/all')
async getAllTeams(@CurrentUser() user: any): Promise<TeamResponseDto[]> {
  if (!user.isSiteAdmin) {
    throw new Error('Unauthorized: Only site administrators can view all teams');
  }
  return this.teamsService.findAll();
}
```

### Frontend Changes

#### `frontend/src/app/dashboard/teams.service.ts`
- Added `allTeamsSignal` to store all teams data
- Added `allTeams` readonly signal accessor
- Added `loadAllTeams()` method that calls the new backend endpoint

```typescript
private readonly allTeamsSignal = signal<Team[]>([]);
public readonly allTeams = this.allTeamsSignal.asReadonly();

async loadAllTeams(): Promise<void> {
  try {
    const teams = await firstValueFrom(
      this.http.get<Team[]>(`${this.apiUrl}/admin/all`)
    );
    this.allTeamsSignal.set(teams);
  } catch (error) {
    console.error('Error loading all teams:', error);
    throw error;
  }
}
```

#### `frontend/src/app/dashboard/dashboard.component.ts`
- Added `showAllTeams` signal for section visibility state
- Added `isLoadingAllTeams` signal for loading state
- Added `toggleAllTeams()` method that loads data on first expand

```typescript
protected readonly showAllTeams = signal(false);
protected readonly isLoadingAllTeams = signal(false);

protected async toggleAllTeams(): Promise<void> {
  const newState = !this.showAllTeams();
  this.showAllTeams.set(newState);

  if (newState && this.teamsService.allTeams().length === 0) {
    this.isLoadingAllTeams.set(true);
    try {
      await this.teamsService.loadAllTeams();
    } catch (error) {
      console.error('Error loading all teams:', error);
    } finally {
      this.isLoadingAllTeams.set(false);
    }
  }
}
```

#### `frontend/src/app/dashboard/dashboard.component.html`
- Added new collapsible section after "All Users" section
- Wrapped in `@if (isAdmin())` to restrict to administrators
- Displays team cards with name, number, visibility, member count
- Teams are clickable to view team details
- Shows loading message while fetching data
- Shows empty message if no teams exist

## Features

1. **Admin-Only Access**: Section only visible to site administrators
2. **Lazy Loading**: Teams are only loaded when section is first expanded
3. **Collapsible**: Section can be expanded/collapsed like other sections
4. **Complete Team Info**: Shows team name, number, visibility, description, member count, and pending requests
5. **Clickable Cards**: Click any team to view its details
6. **Consistent Styling**: Uses same styles as existing team sections

## Usage

1. Log in as a site administrator
2. Navigate to the dashboard
3. Find the "All Teams" collapsible section (between "All Users" and "Pending Team Requests")
4. Click the section header to expand and view all teams in the system
5. Click any team card to view that team's details

## Testing

To test this feature:
1. Ensure you're logged in as a site administrator
2. Verify the "All Teams" section appears on the dashboard
3. Expand the section and verify it loads all teams
4. Verify non-admin users do NOT see this section
5. Click a team card to verify navigation works
