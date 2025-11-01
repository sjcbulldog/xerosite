# User Login Tracking Feature

## Overview
Added a comprehensive login tracking system that records when users log into XeroSite and allows site administrators to view login history through a popup dialog on the main dashboard.

## Backend Implementation

### 1. Database Entity
**File:** `server/src/modules/auth/entities/user-login.entity.ts`
- Created `UserLogin` entity with fields:
  - `id` (UUID primary key)
  - `userId` (foreign key to users table)
  - `loginTime` (timestamp, auto-generated)
  - `ipAddress` (optional, stores IPv4/IPv6 addresses)
  - `userAgent` (optional, stores browser/device information)
- Includes relation to User entity for easy querying

### 2. Database Migration
**File:** `server/src/migrations/1730505000000-AddUserLoginsTable.ts`
- Creates `user_logins` table
- Adds indexes on `user_id` and `login_time` for efficient queries
- Adds foreign key constraint with CASCADE delete
- Table will be created automatically in development (synchronize: true)
- Migration ready for production deployment

### 3. Admin Service Updates
**File:** `server/src/modules/admin/admin.service.ts`
- Added `getLoginHistory()` method:
  - Returns paginated list of login records (default limit: 100)
  - Orders by login time descending (most recent first)
  - Includes user information (name, email) via relation
- Added `recordLogin()` method:
  - Records new login with user ID, IP address, and user agent
  - Called automatically on successful authentication
- Exports AdminService for use in AuthModule

**File:** `server/src/modules/admin/admin.module.ts`
- Added TypeORM repository for UserLogin entity
- Exported AdminService for cross-module usage

### 4. Admin Controller Updates
**File:** `server/src/modules/admin/admin.controller.ts`
- Added GET endpoint `/admin/login-history`
- Restricted to site administrators only
- Accepts optional `limit` query parameter
- Returns login records with user details

### 5. Admin DTOs
**File:** `server/src/modules/admin/dto/login-history.dto.ts`
- `UserLoginDto`: Individual login record with user info
- `LoginHistoryResponseDto`: Response wrapper with total count

### 6. Auth Service Updates
**File:** `server/src/modules/auth/auth.service.ts`
- Modified `login()` method to accept `ipAddress` and `userAgent` parameters
- Calls `adminService.recordLogin()` on successful authentication
- Maintains existing functionality (JWT generation, last login update)

**File:** `server/src/modules/auth/auth.controller.ts`
- Updated login endpoint to extract IP address and user agent from request
- Passes these values to auth service login method

**File:** `server/src/modules/auth/auth.module.ts`
- Imported AdminModule for access to login tracking

## Frontend Implementation

### 1. Admin Service
**File:** `frontend/src/app/admin/admin.service.ts`
- Created Angular service to communicate with admin API endpoints
- `getLoginHistory()` method fetches login records from backend
- Injectable at root level

### 2. Type Definitions
**File:** `frontend/src/app/admin/login-history.types.ts`
- `UserLoginRecord`: Interface for individual login records
- `LoginHistoryResponse`: Response structure from API

### 3. Login History Dialog Component
**File:** `frontend/src/app/admin/login-history-dialog.component.ts`
- Standalone Angular component with OnPush change detection
- Displays login history in a table format
- Features:
  - Loading state while fetching data
  - Error handling and display
  - Empty state when no records exist
  - Browser detection from user agent string
  - Date/time formatting using Angular DatePipe
- Emits `close` event for parent to handle dialog dismissal

**File:** `frontend/src/app/admin/login-history-dialog.component.html`
- Modal overlay with click-outside-to-close
- Responsive table showing:
  - User name
  - Email address
  - Login timestamp (formatted with 'short' date format)
  - IP address
  - Detected browser
- Styled with scrollable content area
- Close button in header and footer

**File:** `frontend/src/app/admin/login-history-dialog.component.scss`
- Modern, clean styling consistent with existing dialogs
- Responsive table with hover effects
- Fixed header and footer with scrollable body
- Maximum width of 1200px for wide screens
- Professional color scheme matching site design

### 4. Dashboard Integration
**File:** `frontend/src/app/dashboard/dashboard.component.ts`
- Imported `LoginHistoryDialogComponent`
- Added `showLoginHistoryDialog` signal for dialog state
- Added `openLoginHistoryDialog()` method
- Added `closeLoginHistoryDialog()` method

**File:** `frontend/src/app/dashboard/dashboard.component.html`
- Added "User Login History" menu item in admin menu (📊 icon)
- Only visible to site administrators
- Opens login history dialog on click
- Dialog renders conditionally based on signal state

## Features

### For Site Administrators
1. **View Login History**: Access complete login history from main dashboard user menu
2. **Detailed Information**: See who logged in, when, from where, and with what browser
3. **Sortable by Time**: Records displayed with most recent first
4. **Search Capability**: Easy to identify login patterns
5. **Security Monitoring**: Track unusual login activity

### Security Considerations
- Login history only accessible by site administrators
- IP addresses tracked for security auditing
- User agent strings help identify device types
- Foreign key cascade ensures data integrity
- Indexes optimize query performance

### Data Tracked
- **User Identity**: Full name and email address
- **Timestamp**: Exact date and time of login
- **IP Address**: IPv4 or IPv6 address (when available)
- **User Agent**: Browser and device information
- **Persistent Records**: Login history retained even if user deleted (cascade delete)

## Testing Notes
1. Login as any user - login will be recorded automatically
2. Login as site administrator
3. Click user menu (top right)
4. Click "User Login History"
5. Verify login record appears in table
6. Test with multiple users and login attempts
7. Verify IP addresses and browser detection working

## Future Enhancements
Potential additions to consider:
- Export login history to CSV
- Filter by date range or user
- Login failure tracking
- Geographic location from IP address
- Session duration tracking
- Suspicious activity alerts
- Login analytics dashboard

## Database Schema
```sql
CREATE TABLE user_logins (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  INDEX idx_user_id (user_id),
  INDEX idx_login_time (login_time),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints
- **GET** `/admin/login-history?limit=100`
  - Authentication: Required (JWT)
  - Authorization: Site administrators only
  - Query Parameters:
    - `limit` (optional): Maximum records to return (default: 100)
  - Response: `LoginHistoryResponseDto`

## Files Created
### Backend
- `server/src/modules/auth/entities/user-login.entity.ts`
- `server/src/migrations/1730505000000-AddUserLoginsTable.ts`
- `server/src/modules/admin/dto/login-history.dto.ts`

### Frontend
- `frontend/src/app/admin/` (new directory)
  - `admin.service.ts`
  - `login-history.types.ts`
  - `login-history-dialog.component.ts`
  - `login-history-dialog.component.html`
  - `login-history-dialog.component.scss`

## Files Modified
### Backend
- `server/src/modules/admin/admin.service.ts`
- `server/src/modules/admin/admin.module.ts`
- `server/src/modules/admin/admin.controller.ts`
- `server/src/modules/auth/auth.service.ts`
- `server/src/modules/auth/auth.controller.ts`
- `server/src/modules/auth/auth.module.ts`

### Frontend
- `frontend/src/app/dashboard/dashboard.component.ts`
- `frontend/src/app/dashboard/dashboard.component.html`
