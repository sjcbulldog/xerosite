# Xerosite System Architecture & Design Overview

**Version:** 2.0  
**Last Updated:** January 21, 2025  
**Application:** Xerosite Team Management Platform

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Technology Stack](#technology-stack)
4. [Architecture Components](#architecture-components)
5. [Core Subsystems](#core-subsystems)
6. [Data Model](#data-model)
7. [Security & Authentication](#security--authentication)
8. [API Design](#api-design)
9. [Frontend Architecture](#frontend-architecture)
10. [File Storage & Management](#file-storage--management)
11. [Email & Notifications](#email--notifications)
12. [Visibility Rules System](#visibility-rules-system)
13. [Calendar & Events](#calendar--events)
14. [Deployment & Operations](#deployment--operations)
15. [Design Documents Index](#design-documents-index)

---

## 1. Executive Summary

### 1.1 Purpose

Xerosite is a comprehensive team management platform designed for organizations that need sophisticated collaboration tools, particularly suited for FIRST Robotics teams and similar structured organizations. The system provides team management, calendar scheduling, messaging, media sharing, and role-based access control in a modern, user-friendly web application.

### 1.2 Key Features

- **User Management**: Email-based authentication with UUID primary keys
- **Team Collaboration**: Multi-team support with hierarchical subteams
- **Calendar System**: Advanced event scheduling with recurrence patterns and attendance tracking
- **Messaging**: Rich messaging with intelligent attachment handling
- **Media Library**: Organized file storage with user group visibility controls
- **Role-Based Access**: Flexible permission system with team-specific roles
- **Email Integration**: Automated notifications with smart attachment delivery
- **Mobile Support**: RESTful API designed for mobile application integration

### 1.3 Target Users

- **FIRST Robotics Teams**: Competition teams with mentors, students, and parents
- **Educational Organizations**: Schools, clubs, and activity groups
- **Non-Profit Organizations**: Community teams and volunteer groups
- **Small Businesses**: Teams requiring structured collaboration tools

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Angular 20+ Application (TypeScript, Signals, Standalone)     │
│  - Dashboard       - Calendar       - Messages                  │
│  - Media Library   - Teams          - User Management           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS/JSON
                           │ JWT Authentication
┌──────────────────────────▼──────────────────────────────────────┐
│                    Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│              NestJS Backend (Node.js/TypeScript)                │
│  ┌─────────────┬──────────────┬──────────────┬───────────────┐ │
│  │   Auth      │    Teams     │   Events     │   Messages    │ │
│  │  Module     │   Module     │   Module     │    Module     │ │
│  └─────────────┴──────────────┴──────────────┴───────────────┘ │
│  ┌─────────────┬──────────────┬──────────────┬───────────────┐ │
│  │ Team Media  │ User Groups  │ Preferences  │   Email       │ │
│  │   Module    │   Module     │   Module     │   Module      │ │
│  └─────────────┴──────────────┴──────────────┴───────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │         Common Services & Guards                            │ │
│  │  - JWT Guards  - File Storage  - Timezone Utils            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │ TypeORM
┌──────────────────────────▼──────────────────────────────────────┐
│                      Data Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│                    MySQL 8+ Database                            │
│  - User Management    - Team Data       - Events & Attendance   │
│  - Messages & Files   - Permissions     - Audit Logs            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
├─────────────────────────────────────────────────────────────────┤
│  - SMTP Email Server  - File Storage (Local/Cloud)              │
│  - Calendar Feeds     - Download Token System                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Principles

1. **Modularity**: Clear separation of concerns with NestJS modules
2. **Type Safety**: Full TypeScript coverage on frontend and backend
3. **Security First**: JWT authentication, role-based access control, input validation
4. **RESTful Design**: Standard HTTP methods and status codes
5. **Reactive Architecture**: Angular signals for efficient state management
6. **Scalability**: Database-driven with support for multiple teams and users
7. **User Experience**: Intuitive UI with real-time feedback and progress indicators
8. **Mobile Ready**: API-first design supporting mobile applications

---

## 3. Technology Stack

### 3.1 Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | Angular | 20.3.7 | Single-page application framework |
| Language | TypeScript | 5.7+ | Type-safe JavaScript |
| State Management | Angular Signals | Native | Reactive state management |
| HTTP Client | HttpClient | Native | API communication |
| Routing | Angular Router | Native | Navigation and guards |
| Build Tool | Angular CLI | Latest | Development and production builds |
| Styling | SCSS | - | Component styling |
| UI Patterns | Standalone Components | Native | Modern component architecture |
| Control Flow | @if/@for/@switch | Native | Template syntax |

**Key Frontend Features:**
- Standalone components (no NgModules)
- Signal-based reactive state
- OnPush change detection strategy
- Lazy-loaded routes
- Interceptors for authentication
- Responsive design (desktop, tablet, mobile)

### 3.2 Backend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | NestJS | Latest | Enterprise Node.js framework |
| Language | TypeScript | 5.0+ | Type-safe Node.js |
| ORM | TypeORM | Latest | Database abstraction |
| Database | MySQL | 8.0+ | Relational database |
| Authentication | Passport JWT | Latest | Token-based auth |
| Validation | class-validator | Latest | DTO validation |
| File Upload | Multer | Latest | Multipart form handling |
| Email | Nodemailer | Latest | Email sending |
| Scheduling | @nestjs/schedule | Latest | Cron jobs |

**Key Backend Features:**
- Modular architecture
- Dependency injection
- Guards for authorization
- Interceptors for logging
- Pipes for validation
- Exception filters for errors
- Database migrations with TypeORM
- Email queue for reliability

### 3.3 Development Tools

- **Version Control**: Git
- **Testing**: Jest (backend), Karma/Jasmine (frontend), Playwright (E2E)
- **Code Quality**: ESLint, Prettier
- **API Testing**: Postman, curl
- **Database Management**: MySQL Workbench

---

## 4. Architecture Components

### 4.1 Application Layers

#### 4.1.1 Presentation Layer (Frontend)

**Responsibilities:**
- User interface rendering
- User input handling
- Client-side validation
- API request orchestration
- State management with signals
- Routing and navigation

**Key Patterns:**
- Component-based architecture
- Service injection with `inject()` function
- Observable streams for async operations
- Signal-based reactivity for state
- Interceptors for HTTP request/response handling

#### 4.1.2 Application Layer (Backend)

**Responsibilities:**
- Business logic implementation
- Request routing
- Authentication and authorization
- Data validation
- Service orchestration
- Error handling

**Key Patterns:**
- Module-based organization
- Controller → Service → Repository pattern
- Dependency injection
- Guard-based authorization
- DTO validation with decorators

#### 4.1.3 Data Layer

**Responsibilities:**
- Data persistence
- Query execution
- Transaction management
- Schema versioning via migrations
- Data integrity enforcement

**Key Patterns:**
- Entity-based modeling with TypeORM
- Repository pattern for data access
- Cascade operations for referential integrity
- Indexed columns for performance
- Migration-based schema evolution

### 4.2 Cross-Cutting Concerns

#### 4.2.1 Authentication & Authorization

**Implementation:**
- JWT tokens with 24-hour expiration
- Email-based login (no usernames)
- Role-based access control (RBAC)
- Permission-based feature access
- Guard decorators on protected routes

**Reference:** [AUTHENTICATION_UPDATES.md](AUTHENTICATION_UPDATES.md)

#### 4.2.2 Error Handling

**Strategy:**
- Global exception filters
- Standard HTTP status codes
- Consistent error response format
- Detailed validation messages
- Error logging for debugging

#### 4.2.3 Logging & Monitoring

**Implementation:**
- Console logging in development
- Structured logging in production
- HTTP request/response logging
- Error tracking and alerting
- Performance monitoring

#### 4.2.4 Data Validation

**Approach:**
- DTO classes with validation decorators
- Automatic validation pipe
- Type checking with TypeScript
- Frontend validation for UX
- Backend validation for security

---

## 5. Core Subsystems

### 5.1 Authentication & User Management

**Purpose:** Handle user registration, login, profile management, and access control.

**Key Features:**
- Email-only authentication (no username)
- UUID primary keys for users
- Email verification system
- Password reset flow
- Multiple emails/phones/addresses per user
- User state management (pending, active, admin, inactive)
- Site admin vs. team admin roles

**Database Tables:**
- `users` - User accounts
- `user_emails` - Email addresses (multiple per user)
- `user_phones` - Phone numbers
- `user_addresses` - Physical addresses
- `email_verification_tokens` - Email verification
- `password_reset_tokens` - Password reset

**API Endpoints:**
- `POST /auth/simple-register` - Quick registration
- `POST /auth/register` - Full profile registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `GET /auth/verify-email` - Verify email address
- `POST /auth/resend-verification` - Resend verification

**Reference:** [AUTHENTICATION_UPDATES.md](AUTHENTICATION_UPDATES.md), [EMAIL_VERIFICATION.md](EMAIL_VERIFICATION.md)

### 5.2 Team Management

**Purpose:** Organize users into teams with hierarchical structure and role-based access.

**Key Features:**
- Multi-team support (users can join multiple teams)
- Public and private teams
- Team-specific roles (customizable)
- Role constraints (incompatible roles)
- Team invitations
- Join requests for public teams
- Subteams with lead positions
- Team links (external resources)
- Team timezone configuration
- Import/export roster functionality

**Database Tables:**
- `teams` - Team definitions
- `user_teams` - Team membership
- `team_roles` - Team-specific roles
- `role_constraints` - Incompatible role pairs
- `subteams` - Team subdivisions
- `subteam_members` - Subteam membership
- `subteam_lead_positions` - Leadership positions
- `team_invitations` - Pending invitations
- `team_links` - External links

**API Endpoints:**
- `POST /teams` - Create team
- `GET /teams` - List user's teams
- `GET /teams/public/available` - List joinable public teams
- `GET /teams/:id` - Get team details
- `PATCH /teams/:id` - Update team
- `DELETE /teams/:id` - Delete team
- `GET /teams/:id/members` - List members
- `POST /teams/:id/members` - Add member
- `PATCH /teams/:teamId/members/:userId` - Update member roles
- `DELETE /teams/:teamId/members/:userId` - Remove member
- `POST /teams/:id/request-join` - Request to join public team

**Reference:** [PERMISSIONS_IMPLEMENTATION.md](PERMISSIONS_IMPLEMENTATION.md)

### 5.3 Calendar & Events

**Purpose:** Schedule team events with advanced recurrence patterns and attendance tracking.

**Key Features:**
- One-time and recurring events
- Recurrence types: daily, weekly, monthly, yearly
- Complex recurrence patterns (e.g., 2nd Tuesday of each month)
- Event visibility by user groups
- Attendance tracking with YES/NO/MAYBE
- Exclusion dates for recurring events
- Timezone-aware date handling
- iCal feed export (WebCal)
- Multiple calendar views (month, week, day)

**Database Tables:**
- `team_events` - Event definitions
- `event_attendance` - User attendance records
- `event_exclusion_dates` - Deleted occurrences of recurring events

**Recurrence Patterns:**
- **Daily**: Every N days
- **Weekly**: Specific days of week (e.g., Mon, Wed, Fri)
- **Monthly**: Specific dates (e.g., 15th) or relative (e.g., 2nd Tuesday)
- **Yearly**: Annual events

**API Endpoints:**
- `POST /teams/:teamId/events` - Create event
- `GET /teams/:teamId/events` - List events
- `GET /teams/:teamId/events/:id` - Get event details
- `PATCH /teams/:teamId/events/:id` - Update event
- `DELETE /teams/:teamId/events/:id` - Delete event (or occurrence)
- `PATCH /teams/:teamId/events/:id/attendance` - Update attendance
- `GET /teams/:teamId/events/:id/attendance/:date` - Get instance attendance
- `GET /teams/:teamId/events/attendance/range` - Get user attendance for date range
- `GET /calendar/:teamId` - iCal feed

**Reference:** [CALENDAR_FEED.md](CALENDAR_FEED.md)

### 5.4 Messaging System

**Purpose:** Send rich messages to team members with intelligent attachment handling.

**Key Features:**
- Send to all members or specific user groups
- Multiple file attachments (up to 10 files, 50MB total)
- Smart attachment delivery:
  - Small files (≤1 MB): Attached to email
  - Large files (>1 MB): Download links with secure tokens
- Rich text message content
- Email notifications
- Upload progress tracking
- Recipient filtering by visibility rules

**Database Tables:**
- `team_messages` - Messages
- `message_download_tokens` - Secure download tokens for large attachments
- `stored_files` - File metadata (via File Storage System)

**Attachment Strategy:**
- **Small Files**: Base64 encoded, attached to email directly
- **Large Files**: Stored on server, secure download link sent in email
- **Download Tokens**: 72-hour expiration, one-time use for security

**API Endpoints:**
- `POST /teams/:teamId/messages` - Send message
- `GET /teams/:teamId/messages` - List messages
- `GET /teams/:teamId/messages/:messageId/attachments/:fileId/download` - Download attachment (authenticated)
- `GET /api/public/download/:token` - Download via token (no auth required)

**Reference:** [DOWNLOAD_TOKENS.md](DOWNLOAD_TOKENS.md), [UPLOAD_PROGRESS.md](UPLOAD_PROGRESS.md)

### 5.5 Team Media

**Purpose:** Store and organize team photos, videos, and documents with access control.

**Key Features:**
- Upload images, videos, documents
- Organize by year
- User group visibility restrictions
- Image preview (inline display)
- Video preview with thumbnail generation
- Download files
- Drag-and-drop upload
- Upload progress indicator
- Filter by title, filename, or uploader
- Display order management

**Database Tables:**
- `team_media` - Media metadata
- `stored_files` - File storage (via File Storage System)

**File Types:**
- **Pictures**: JPEG, PNG, GIF
- **Videos**: MP4, MOV, AVI
- **Documents**: PDF, DOC, DOCX, XLS, XLSX
- **Other**: ZIP, TXT, CSV

**API Endpoints:**
- `POST /teams/:teamId/media` - Upload file
- `GET /teams/:teamId/media` - List media
- `GET /teams/:teamId/media/:id/download` - Download file
- `GET /teams/:teamId/media/:id/preview` - Preview file (inline)
- `PATCH /teams/:teamId/media/:id` - Update title/order/user group
- `DELETE /teams/:teamId/media/:id` - Delete file

**Reference:** [FILE_STORAGE_DESIGN.md](FILE_STORAGE_DESIGN.md)

### 5.6 User Groups & Visibility Rules

**Purpose:** Create flexible groups of users for targeted content visibility.

**Key Features:**
- Public user groups (team-wide)
- Private user groups (creator only)
- Dynamic membership via visibility rules
- Complex rule logic (AND/OR operators)
- Multiple criteria types:
  - All team members
  - Specific roles
  - Subteam members
  - Subteam leads
  - Selected users
- Used for: events, messages, media, other content

**Database Tables:**
- `user_groups` - Group definitions
- `user_group_visibility_rules` - Rule criteria (JSON)

**Visibility Rule Structure:**
```json
{
  "ruleSet": {
    "operator": "AND",
    "rows": [
      {
        "criteriaType": "roles",
        "roles": ["Student", "Mentor"]
      },
      {
        "criteriaType": "subteam_members",
        "subteamId": "uuid"
      }
    ]
  }
}
```

**Logic:**
- Within a row: AND (all criteria must match)
- Between rows: OR (any row can match)

**API Endpoints:**
- `POST /teams/:teamId/user-groups` - Create group
- `GET /teams/:teamId/user-groups` - List groups
- `GET /teams/:teamId/user-groups/:id` - Get group
- `PATCH /teams/:teamId/user-groups/:id` - Update group
- `DELETE /teams/:teamId/user-groups/:id` - Delete group

### 5.7 User Preferences

**Purpose:** Store per-user, per-team preferences for notifications and UI settings.

**Key Features:**
- Email notification preferences
- SMS notification preferences
- Dashboard layout preferences
- Theme preferences (light/dark)
- Language preferences
- Per-team configuration

**Database Tables:**
- `user_preferences` - User preference settings

**API Endpoints:**
- `GET /preferences` - Get current user's preferences
- `PUT /preferences` - Update preferences

---

## 6. Data Model

### 6.1 Core Entities

#### 6.1.1 User Entity

```typescript
@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  middleName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'active', 'admin', 'inactive'],
    default: 'pending' 
  })
  state: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date;

  @OneToMany(() => UserEmail, email => email.user)
  emails: UserEmail[];

  @OneToMany(() => UserPhone, phone => phone.user)
  phones: UserPhone[];

  @OneToMany(() => UserAddress, address => address.user)
  addresses: UserAddress[];
}
```

**Key Relationships:**
- One-to-many with UserEmail, UserPhone, UserAddress
- One-to-many with UserTeam (team memberships)
- One-to-many with StoredFile (uploaded files)

#### 6.1.2 Team Entity

```typescript
@Entity('teams')
export class Team extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int', nullable: true })
  teamNumber: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    type: 'enum', 
    enum: ['public', 'private'],
    default: 'private' 
  })
  visibility: string;

  @Column({ type: 'varchar', length: 100, default: 'UTC' })
  timezone: string;

  @Column({ type: 'json', nullable: true })
  roles: string[];

  @OneToMany(() => UserTeam, userTeam => userTeam.team)
  members: UserTeam[];

  @OneToMany(() => Subteam, subteam => subteam.team)
  subteams: Subteam[];

  @OneToMany(() => TeamEvent, event => event.team)
  events: TeamEvent[];

  @OneToMany(() => TeamMessage, message => message.team)
  messages: TeamMessage[];
}
```

**Key Relationships:**
- One-to-many with UserTeam (members)
- One-to-many with Subteam
- One-to-many with TeamEvent, TeamMessage, TeamMedia
- One-to-many with UserGroup

#### 6.1.3 UserTeam Entity (Many-to-Many Join)

```typescript
@Entity('user_teams')
export class UserTeam extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  teamId: string;

  @Column({ type: 'json' })
  roles: string[];

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'inactive'],
    default: 'active'
  })
  status: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Team)
  team: Team;
}
```

#### 6.1.4 TeamEvent Entity

```typescript
@Entity('team_events')
export class TeamEvent extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  teamId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'timestamp' })
  startDateTime: Date;

  @Column({ type: 'timestamp' })
  endDateTime: Date;

  @Column({
    type: 'enum',
    enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
    default: 'none'
  })
  recurrenceType: string;

  @Column({ type: 'json', nullable: true })
  recurrencePattern: any;

  @Column({ type: 'date', nullable: true })
  recurrenceEndDate: Date;

  @Column({ type: 'json', nullable: true })
  excludedDates: string[];

  @Column({ type: 'uuid', nullable: true })
  userGroupId: string;

  @Column({ type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => Team)
  team: Team;

  @ManyToOne(() => UserGroup)
  userGroup: UserGroup;
}
```

### 6.2 Relationships Diagram

```
User ──────┬──────── UserEmail
           ├──────── UserPhone
           ├──────── UserAddress
           ├──────── UserTeam ────── Team ──────┬──────── TeamEvent
           └──────── StoredFile                 ├──────── TeamMessage
                                                 ├──────── TeamMedia
                                                 ├──────── Subteam
                                                 ├──────── UserGroup
                                                 └──────── TeamLink

Team ────── RoleConstraint
       └──── TeamInvitation

TeamEvent ────── EventAttendance ────── User
            └──── UserGroup

TeamMessage ────── StoredFile
              └──── DownloadToken

Subteam ────── SubteamMember ────── User
          └──── SubteamLeadPosition ────── User

UserGroup ────── VisibilityRules (JSON)
```

### 6.3 Database Indexes

**Performance Optimizations:**
- Primary keys on all tables (UUID)
- Foreign key indexes
- `user_emails.email` - Unique index for login
- `user_teams.userId` and `user_teams.teamId` - Join optimization
- `team_events.teamId` and `team_events.startDateTime` - Calendar queries
- `team_messages.teamId` and `team_messages.sentAt` - Message listing
- `stored_files.userId` and `stored_files.subsystem` - File queries
- `message_download_tokens.token` - Token lookup
- `email_verification_tokens.token` - Verification lookup

---

## 7. Security & Authentication

### 7.1 Authentication Flow

**Registration:**
```
1. User submits registration form
2. Backend validates email uniqueness
3. User account created with 'pending' state
4. Email verification token generated (32 bytes)
5. Verification email sent
6. User clicks link → token validated → state set to 'active'
7. Welcome email sent
8. User can now log in
```

**Login:**
```
1. User submits email + password
2. Backend validates credentials
3. Check user state (must be 'active' or 'admin')
4. Generate JWT token (24-hour expiration)
5. Return token + user data to frontend
6. Frontend stores token
7. Token included in Authorization header for subsequent requests
```

**Token Structure:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "state": "active",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### 7.2 Authorization Levels

**1. Public Routes** (No authentication):
- Health check
- User registration
- Login
- Email verification
- Password reset
- Public download tokens

**2. Authenticated Routes** (JWT required):
- User profile
- Teams list
- Create team
- Join team

**3. Team Member Routes** (Must be team member):
- View team details
- View events
- View messages
- Download media

**4. Team Admin Routes** (Must have Administrator role):
- Edit team settings
- Add/remove members
- Manage roles
- Delete team
- Send messages (with permission)
- Schedule events (with permission)

**5. Site Admin Routes** (User state = 'admin'):
- View all users
- View all teams
- Change user state
- Grant site admin status
- Access any team

### 7.3 Permission System

**Team-Level Permissions:**
- `SEND_MESSAGES` - Can send team messages
- `SCHEDULE_EVENTS` - Can create/edit events
- `MANAGE_USER_GROUPS` - Can create public user groups
- `UPLOAD_MEDIA` - Can upload team media

**Permission Assignment:**
- Configured per-user per-team
- Stored in `user_permissions` table
- Administrator role has all permissions by default
- Extensible for future permissions

**Reference:** [PERMISSIONS_IMPLEMENTATION.md](PERMISSIONS_IMPLEMENTATION.md)

### 7.4 Security Measures

**Password Security:**
- Bcrypt hashing (10 rounds)
- Minimum complexity requirements
- No password reuse (future)

**Token Security:**
- JWT with HS256 signing
- 24-hour expiration
- Secure secret key (environment variable)
- Refresh token support (future)

**Input Validation:**
- DTO validation with class-validator
- Type checking with TypeScript
- SQL injection prevention via TypeORM
- XSS prevention with sanitization

**File Upload Security:**
- File type validation
- File size limits (50MB for messages)
- Virus scanning (planned)
- Stored with UUID filenames (prevents path traversal)

**Rate Limiting:**
- Planned for authentication endpoints
- Prevents brute force attacks

---

## 8. API Design

### 8.1 RESTful Principles

**Resource-Based URLs:**
```
GET    /teams              - List teams
POST   /teams              - Create team
GET    /teams/:id          - Get team
PATCH  /teams/:id          - Update team
DELETE /teams/:id          - Delete team

GET    /teams/:id/members  - List members
POST   /teams/:id/members  - Add member
```

**HTTP Methods:**
- `GET` - Retrieve resource(s)
- `POST` - Create new resource
- `PATCH` - Partial update
- `PUT` - Full replacement (preferences)
- `DELETE` - Remove resource

**Status Codes:**
- `200 OK` - Successful request
- `201 Created` - Resource created
- `204 No Content` - Success with no body
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity` - Validation failed
- `500 Internal Server Error` - Server error

### 8.2 Request/Response Format

**Request:**
```json
POST /teams
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Robotics Team 1425",
  "teamNumber": 1425,
  "description": "FIRST Robotics Competition Team",
  "visibility": "private",
  "timezone": "America/Los_Angeles",
  "roles": ["Mentor", "Student", "Parent"]
}
```

**Response:**
```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "uuid",
  "name": "Robotics Team 1425",
  "teamNumber": 1425,
  "description": "FIRST Robotics Competition Team",
  "visibility": "private",
  "timezone": "America/Los_Angeles",
  "roles": ["Administrator", "Mentor", "Student", "Parent"],
  "createdAt": "2025-01-21T10:00:00.000Z",
  "updatedAt": "2025-01-21T10:00:00.000Z"
}
```

**Error Response:**
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "name",
      "message": "Name must not be empty"
    }
  ]
}
```

### 8.3 Pagination

**Query Parameters:**
```
GET /teams/:id/messages?limit=20&offset=40
```

**Response:**
```json
{
  "data": [...],
  "total": 120,
  "limit": 20,
  "offset": 40
}
```

### 8.4 Filtering & Sorting

**Date Ranges:**
```
GET /teams/:id/events?startDate=2025-01-01&endDate=2025-01-31
```

**Status Filtering:**
```
GET /teams/:id/messages?status=sent
```

**Sorting:**
```
GET /teams/:id/members?sort=name&order=asc
```

### 8.5 File Uploads

**Multipart Form Data:**
```
POST /teams/:teamId/media
Content-Type: multipart/form-data

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary
Content-Disposition: form-data; name="title"

Team Photo 2025
------WebKitFormBoundary--
```

**Reference:** [MOBILE_API_GUIDE.md](MOBILE_API_GUIDE.md)

---

## 9. Frontend Architecture

### 9.1 Angular Application Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.ts                     # Root component
│   │   ├── app.config.ts              # Application configuration
│   │   ├── app.routes.ts              # Route definitions
│   │   │
│   │   ├── auth/                      # Authentication module
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.interceptor.ts
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   │
│   │   ├── dashboard/                 # Main dashboard
│   │   │   ├── dashboard.component.ts
│   │   │   ├── dashboard.component.html
│   │   │   ├── dashboard.component.scss
│   │   │   ├── teams.service.ts
│   │   │   ├── team-detail.component.ts
│   │   │   ├── calendar/
│   │   │   │   ├── calendar.component.ts
│   │   │   │   ├── calendar.service.ts
│   │   │   │   └── calendar.types.ts
│   │   │   ├── messages/
│   │   │   ├── team-media/
│   │   │   └── user-groups/
│   │   │
│   │   ├── preferences/               # User preferences
│   │   └── profile/                   # User profile
│   │
│   ├── index.html
│   ├── main.ts                        # Bootstrap
│   └── styles.scss                    # Global styles
│
├── angular.json                       # Angular configuration
├── tsconfig.json                      # TypeScript config
└── package.json                       # Dependencies
```

### 9.2 Component Architecture

**Standalone Components:**
```typescript
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="team-list">
      @for (team of teams(); track team.id) {
        <div class="team-card">
          <h3>{{ team.name }}</h3>
          <p>{{ team.description }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .team-list { display: grid; gap: 1rem; }
    .team-card { padding: 1rem; border: 1px solid #ddd; }
  `]
})
export class TeamListComponent {
  private http = inject(HttpClient);
  
  teams = signal<Team[]>([]);
  selectedTeam = signal<Team | null>(null);
  
  teamCount = computed(() => this.teams().length);
  
  async loadTeams() {
    const teams = await firstValueFrom(
      this.http.get<Team[]>('/api/teams')
    );
    this.teams.set(teams);
  }
}
```

**Key Patterns:**
- Use `inject()` instead of constructor injection
- Use `signal()` for reactive state
- Use `computed()` for derived state
- Use `@if`, `@for`, `@switch` for control flow
- Set `changeDetection: ChangeDetectionStrategy.OnPush`
- Avoid `ngClass` and `ngStyle` (use direct bindings instead)

**Reference:** [.github/copilot-instructions.md](../.github/copilot-instructions.md)

### 9.3 State Management

**Signal-Based State:**
```typescript
export class TeamMediaService {
  private apiUrl = '/api/teams';
  private http = inject(HttpClient);
  
  // Signals for reactive state
  mediaFiles = signal<TeamMedia[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  
  // Computed values
  pictureFiles = computed(() => 
    this.mediaFiles().filter(m => m.mimeType.startsWith('image/'))
  );
  
  videoFiles = computed(() => 
    this.mediaFiles().filter(m => m.mimeType.startsWith('video/'))
  );
  
  async loadMedia(teamId: string) {
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const media = await firstValueFrom(
        this.http.get<TeamMedia[]>(`${this.apiUrl}/${teamId}/media`)
      );
      this.mediaFiles.set(media);
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

### 9.4 Routing & Guards

**Route Configuration:**
```typescript
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: 'teams', component: TeamListComponent },
      { path: 'teams/:id', component: TeamDetailComponent },
      { path: 'calendar', component: CalendarComponent },
      { path: 'messages', component: MessagesComponent }
    ]
  }
];
```

**Auth Guard:**
```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated()) {
    return true;
  }
  
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
```

### 9.5 HTTP Interceptor

**Authentication Interceptor:**
```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
```

---

## 10. File Storage & Management

### 10.1 File Storage Service

**Purpose:** Centralized file management for all subsystems.

**Architecture:**
```
Application Modules
      ↓
FileStorageService
      ↓
├── Database (stored_files table)
└── File System (FILE_STORAGE_PATH)
```

**Key Features:**
- UUID-based filenames (prevents collisions and path traversal)
- Original filename preservation in database
- MIME type detection
- Subsystem tracking (messages, team-media)
- User association
- File size tracking
- Automatic directory creation

**Core Methods:**
```typescript
class FileStorageService {
  async storeFile(
    fileBuffer: Buffer,
    originalFilename: string,
    userId: string,
    subsystem: string,
    mimeType?: string
  ): Promise<StoredFile>;
  
  async getFile(fileId: string): Promise<{ 
    file: StoredFile; 
    data: Buffer 
  }>;
  
  async deleteFile(fileId: string): Promise<void>;
  
  async getFilesByUser(userId: string, subsystem?: string): Promise<StoredFile[]>;
  
  async getFilesBySubsystem(subsystem: string): Promise<StoredFile[]>;
  
  async getFileMetadata(fileId: string): Promise<StoredFile>;
}
```

### 10.2 Subsystem Integration

**Messages Subsystem:**
- Multiple attachments per message
- Smart delivery based on file size
- Download tokens for large files

**Team Media Subsystem:**
- Single file per media record
- Preview support for images/videos
- Thumbnail generation for videos
- Organized by year and type

**Reference:** [FILE_STORAGE_DESIGN.md](FILE_STORAGE_DESIGN.md)

### 10.3 Configuration

**Environment Variable:**
```bash
FILE_STORAGE_PATH=/absolute/path/to/storage
```

**Requirements:**
- Must be absolute path
- Directory created automatically if missing
- Application needs read/write permissions

---

## 11. Email & Notifications

### 11.1 Email System Architecture

**Components:**
- Nodemailer for SMTP
- Handlebars for email templates
- Email queue for reliability (future)
- Background job processing

**Configuration:**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
EMAIL_FROM=noreply@xerosite.com
APP_URL=https://your-domain.com
```

### 11.2 Email Types

**Verification Email:**
- Sent on registration (except first user)
- Contains verification link with token
- Token expires after 24 hours
- Can resend if needed

**Welcome Email:**
- Sent after email verification
- Welcomes user to the platform

**Password Reset Email:**
- Sent on forgot password request
- Contains reset link with token
- Token expires after 1 hour

**Message Notification:**
- Sent when team message is sent
- Includes message content
- Small attachments embedded (≤1 MB)
- Large attachments as download links

**Team Invitation:**
- Sent when invited to team
- Contains acceptance link

### 11.3 Email Templates

**Location:** `server/src/modules/email/templates/`

**Templates:**
- `verification.hbs` - Email verification
- `welcome.hbs` - Welcome message
- `password-reset.hbs` - Password reset
- `message.hbs` - Team message notification
- `invitation.hbs` - Team invitation

**Template Variables:**
```handlebars
<h1>Welcome, {{firstName}}!</h1>
<p>Your verification link:</p>
<a href="{{verificationUrl}}">Verify Email</a>
```

### 11.4 Email Queue (Planned)

**Features:**
- Asynchronous email sending
- Retry logic for failures
- Email status tracking
- Batch sending for large recipient lists

**Database Table:** `email_queue`

**Reference:** [EMAIL_VERIFICATION.md](EMAIL_VERIFICATION.md)

---

## 12. Visibility Rules System

### 12.1 Purpose

Allow fine-grained control over who can see specific content (events, messages, media) based on dynamic user attributes.

### 12.2 Rule Structure

**JSON-Based Rules:**
```json
{
  "ruleSet": {
    "operator": "OR",
    "rows": [
      {
        "criteriaType": "roles",
        "roles": ["Student", "Mentor"]
      },
      {
        "criteriaType": "subteam_members",
        "subteamId": "programming-subteam-uuid"
      },
      {
        "criteriaType": "subteam_leads",
        "subteamId": "mechanical-subteam-uuid"
      }
    ]
  }
}
```

### 12.3 Criteria Types

**1. all_members**
- All team members can see the content
- No additional parameters

**2. roles**
- Users with specific roles
- Parameters: `roles` (array of role names)

**3. subteam_members**
- Members of a specific subteam
- Parameters: `subteamId`

**4. subteam_leads**
- Lead positions in a specific subteam
- Parameters: `subteamId`

**5. select_users**
- Specific individual users
- Parameters: `userIds` (array of user IDs)

### 12.4 Logic Operators

**Within a Row (AND):**
All criteria in a row must match for the row to be satisfied.

**Between Rows (OR):**
If any row is satisfied, the user has access.

**Example:**
```json
{
  "ruleSet": {
    "operator": "OR",
    "rows": [
      {
        "criteriaType": "roles",
        "roles": ["Administrator"]
      },
      {
        "criteriaType": "subteam_members",
        "subteamId": "programming-uuid"
      }
    ]
  }
}
```
**Result:** Administrators OR Programming subteam members can see the content.

### 12.5 Implementation

**Backend:**
```typescript
async isUserInVisibilityRules(
  userId: string,
  teamId: string,
  visibilityRules: any
): Promise<boolean> {
  // Support both formats: { rows: [] } and { ruleSet: { rows: [] } }
  const rows = visibilityRules.ruleSet?.rows || visibilityRules.rows || [];
  
  for (const row of rows) {
    const { criteriaType } = row;
    
    switch (criteriaType) {
      case 'all_users':
        return true;
        
      case 'select_users':
        if (row.userIds.includes(userId)) {
          return true;
        }
        break;
        
      case 'roles':
        const userTeam = await this.userTeamRepository.findOne({
          where: { userId, teamId }
        });
        const hasRole = row.roles.some(role => 
          userTeam.roles.includes(role)
        );
        if (hasRole) {
          return true;
        }
        break;
        
      case 'subteam_members':
        const isMember = await this.subteamMemberRepository.findOne({
          where: { userId, subteamId: row.subteamId }
        });
        if (isMember) {
          return true;
        }
        break;
        
      case 'subteam_leads':
        const isLead = await this.subteamLeadPositionRepository.findOne({
          where: { leadUserId: userId, subteamId: row.subteamId }
        });
        if (isLead) {
          return true;
        }
        break;
    }
  }
  
  return false;
}
```

### 12.6 Usage Across Subsystems

**Events:**
- `TeamEvent.userGroupId` references a UserGroup
- Only users matching the group's visibility rules see the event

**Messages:**
- `TeamMessage.userGroupId` references a UserGroup
- Only matching users receive email notifications

**Media:**
- `TeamMedia.userGroupId` references a UserGroup
- Only matching users see the media file in the library

**User Groups:**
- `UserGroup.visibilityRules` defines the group membership
- Dynamic calculation based on current user attributes

---

## 13. Calendar & Events

### 13.1 Event Recurrence System

**Supported Recurrence Types:**
- None (one-time event)
- Daily
- Weekly
- Monthly
- Yearly

**Recurrence Patterns:**

**Daily:**
```json
{
  "interval": 2  // Every 2 days
}
```

**Weekly:**
```json
{
  "daysOfWeek": [1, 3, 5]  // Monday, Wednesday, Friday
}
```

**Monthly (by date):**
```json
{
  "daysOfMonth": [15]  // 15th of each month
}
```

**Monthly (by position):**
```json
{
  "weekOfMonth": 2,   // 2nd week
  "dayOfWeek": 2      // Tuesday
}
```

### 13.2 Excluded Dates

When deleting a single occurrence of a recurring event:
```typescript
DELETE /teams/:teamId/events/:id?occurrenceDate=2025-11-15
```

**Result:**
- Event is NOT deleted
- `occurrenceDate` added to `excludedDates` array
- Future occurrences continue normally
- Excluded date hidden in calendar

### 13.3 Attendance Tracking

**Attendance Statuses:**
- `yes` - Attending
- `no` - Not attending
- `not_sure` - Maybe attending

**Per-Instance Tracking:**
```typescript
@Entity('event_attendance')
export class EventAttendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'date' })
  instanceDate: Date;

  @Column({
    type: 'enum',
    enum: ['yes', 'no', 'not_sure']
  })
  attendance: string;
}
```

**Unique Constraint:** (eventId, userId, instanceDate)

### 13.4 iCal Feed (WebCal)

**Endpoint:**
```
GET /calendar/:teamId
```

**Returns:** ICS format calendar feed

**Subscription URL:**
```
webcal://your-domain.com/calendar/:teamId
```

**Features:**
- All team events included
- Recurrence rules (RRULE)
- Exclusion dates (EXDATE)
- Floating time (team timezone)
- Standard iCalendar format (RFC 5545)

**Reference:** [CALENDAR_FEED.md](CALENDAR_FEED.md)

---

## 14. Deployment & Operations

### 14.1 Environment Variables

**Required:**
```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=xerosite

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
EMAIL_FROM=noreply@xerosite.com

# File Storage
FILE_STORAGE_PATH=/absolute/path/to/storage

# Application
APP_URL=https://your-domain.com
PORT=3000
```

**Optional:**
```bash
# Timezone (default: UTC)
TZ=America/Los_Angeles

# CORS (default: *)
CORS_ORIGIN=https://your-frontend.com
```

### 14.2 Database Migrations

**Run Migrations:**
```bash
cd server
npm run migration:run
```

**Generate Migration:**
```bash
npm run migration:generate -- -n MigrationName
```

**Create Empty Migration:**
```bash
npm run migration:create -- -n MigrationName
```

**Revert Migration:**
```bash
npm run migration:revert
```

**Migration Files:**
Located in `server/src/migrations/`

**Naming Convention:**
`{timestamp}-{Description}.ts`

Example: `1730135909000-AddUserPermissions.ts`

### 14.3 Build & Deployment

**Backend Build:**
```bash
cd server
npm install
npm run build
npm run start:prod
```

**Frontend Build:**
```bash
cd frontend
npm install
npm run build
```

**Output:** `frontend/dist/` (static files)

**Deployment Options:**
- Docker containers
- Traditional VPS (nginx + Node.js)
- Cloud platforms (AWS, Azure, Google Cloud)
- Platform-as-a-Service (Heroku, Render)

### 14.4 Monitoring & Logging

**Health Check Endpoint:**
```
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Health check successful",
  "data": {
    "status": "ok",
    "database": "connected"
  }
}
```

**Logging Strategy:**
- Console logging in development
- File logging in production
- Error tracking service (Sentry, etc.)
- Database query logging (development only)

### 14.5 Backup & Recovery

**Database Backups:**
```bash
mysqldump -u root -p xerosite > backup.sql
```

**File Storage Backups:**
```bash
tar -czf storage-backup.tar.gz /path/to/storage
```

**Restore:**
```bash
mysql -u root -p xerosite < backup.sql
tar -xzf storage-backup.tar.gz -C /path/to/storage
```

---

## 15. Design Documents Index

### Detailed Design Documents

The following documents provide in-depth information on specific subsystems:

1. **[AUTHENTICATION_UPDATES.md](AUTHENTICATION_UPDATES.md)**
   - Email-only authentication
   - UUID primary keys
   - User state management

2. **[PERMISSIONS_IMPLEMENTATION.md](PERMISSIONS_IMPLEMENTATION.md)**
   - Per-user per-team permissions
   - Permission types and constraints
   - Implementation status and roadmap

3. **[FILE_STORAGE_DESIGN.md](FILE_STORAGE_DESIGN.md)**
   - Centralized file storage service
   - Integration with messages and media
   - MIME type detection and security

4. **[EMAIL_VERIFICATION.md](EMAIL_VERIFICATION.md)**
   - Email verification flow
   - Token generation and expiration
   - Email templates and configuration

5. **[CALENDAR_FEED.md](CALENDAR_FEED.md)**
   - iCal feed generation
   - WebCal subscription
   - Recurrence rules and exclusions

6. **[DOWNLOAD_TOKENS.md](DOWNLOAD_TOKENS.md)**
   - Secure download tokens for large attachments
   - Token expiration and one-time use
   - Public download endpoint

7. **[MOBILE_API_GUIDE.md](MOBILE_API_GUIDE.md)**
   - Complete API reference
   - Authentication flow
   - Request/response examples
   - Mobile integration patterns

8. **[TEST_PLAN.md](TEST_PLAN.md)**
   - Comprehensive test scenarios
   - Unit, integration, and E2E tests
   - Test schedule and resources

9. **[UPLOAD_PROGRESS.md](UPLOAD_PROGRESS.md)**
   - Progress bar for file uploads
   - Real-time feedback
   - Implementation details

---

## Appendix A: Key Technologies & Libraries

### Backend Dependencies

```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/platform-express": "^10.0.0",
  "@nestjs/typeorm": "^10.0.0",
  "typeorm": "^0.3.17",
  "mysql2": "^3.6.0",
  "@nestjs/passport": "^10.0.0",
  "@nestjs/jwt": "^10.1.0",
  "passport": "^0.6.0",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1",
  "multer": "^1.4.5-lts.1",
  "nodemailer": "^6.9.7",
  "handlebars": "^4.7.8",
  "@nestjs/schedule": "^4.0.0"
}
```

### Frontend Dependencies

```json
{
  "@angular/common": "^20.3.7",
  "@angular/core": "^20.3.7",
  "@angular/platform-browser": "^20.3.7",
  "@angular/router": "^20.3.7",
  "@angular/forms": "^20.3.7",
  "rxjs": "^7.8.0",
  "tslib": "^2.3.0",
  "zone.js": "~0.15.0"
}
```

---

## Appendix B: Database Schema Summary

### Core Tables

- `users` - User accounts
- `user_emails` - Email addresses
- `user_phones` - Phone numbers
- `user_addresses` - Physical addresses
- `teams` - Team definitions
- `user_teams` - Team membership
- `team_roles` - Team-specific roles
- `role_constraints` - Incompatible roles
- `subteams` - Team subdivisions
- `subteam_members` - Subteam membership
- `subteam_lead_positions` - Leadership positions
- `team_events` - Calendar events
- `event_attendance` - Event attendance records
- `event_exclusion_dates` - Recurring event exclusions
- `team_messages` - Messages
- `stored_files` - File metadata
- `message_download_tokens` - Secure download tokens
- `team_media` - Media library items
- `user_groups` - User groups
- `team_links` - External links
- `user_preferences` - User preferences
- `user_permissions` - Per-user per-team permissions
- `team_invitations` - Pending invitations
- `email_verification_tokens` - Email verification
- `password_reset_tokens` - Password reset

---

## Appendix C: API Endpoint Summary

### Authentication
- `POST /auth/simple-register`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/verify-email`
- `POST /auth/resend-verification`

### Teams
- `GET /teams`
- `POST /teams`
- `GET /teams/:id`
- `PATCH /teams/:id`
- `DELETE /teams/:id`
- `GET /teams/:id/members`
- `POST /teams/:id/members`
- `PATCH /teams/:teamId/members/:userId`
- `DELETE /teams/:teamId/members/:userId`

### Events
- `GET /teams/:teamId/events`
- `POST /teams/:teamId/events`
- `GET /teams/:teamId/events/:id`
- `PATCH /teams/:teamId/events/:id`
- `DELETE /teams/:teamId/events/:id`
- `PATCH /teams/:teamId/events/:id/attendance`
- `GET /teams/:teamId/events/:id/attendance/:date`
- `GET /calendar/:teamId` (iCal feed)

### Messages
- `GET /teams/:teamId/messages`
- `POST /teams/:teamId/messages`
- `GET /teams/:teamId/messages/:messageId/attachments/:fileId/download`
- `GET /api/public/download/:token`

### Media
- `GET /teams/:teamId/media`
- `POST /teams/:teamId/media`
- `GET /teams/:teamId/media/:id/download`
- `GET /teams/:teamId/media/:id/preview`
- `PATCH /teams/:teamId/media/:id`
- `DELETE /teams/:teamId/media/:id`

### User Groups
- `GET /teams/:teamId/user-groups`
- `POST /teams/:teamId/user-groups`
- `GET /teams/:teamId/user-groups/:id`
- `PATCH /teams/:teamId/user-groups/:id`
- `DELETE /teams/:teamId/user-groups/:id`

---

## Conclusion

Xerosite is a modern, scalable team management platform built with enterprise-grade technologies and best practices. The architecture supports:

- **Flexible Team Management**: Multi-team support with customizable roles
- **Advanced Scheduling**: Recurring events with complex patterns
- **Intelligent Messaging**: Smart attachment handling based on file size
- **Secure File Storage**: Centralized storage with access control
- **Dynamic Visibility**: Rule-based content filtering
- **Mobile Integration**: RESTful API for mobile applications
- **Email Integration**: Automated notifications with templates
- **Extensibility**: Modular design for future enhancements

The system is production-ready with comprehensive security measures, robust error handling, and excellent user experience. It's designed to scale from small teams to large organizations with thousands of users.

For detailed information on specific subsystems, refer to the individual design documents listed in [Section 15](#15-design-documents-index).

---

**Document Revision History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-21 | System Architect | Initial comprehensive design document |
| 2.0 | 2025-01-21 | System Architect | Incorporated all subsystem design documents |

---

**End of System Architecture Document**
