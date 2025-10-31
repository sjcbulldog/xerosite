# Xerosite Mobile API Guide

**Version:** 1.0  
**Last Updated:** October 31, 2025  
**Base URL:** `https://your-domain.com/api` or `http://localhost:3000/api` for development

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Health Check](#health-check)
   - [Authentication & Users](#authentication--users)
   - [Teams](#teams)
   - [Team Members](#team-members)
   - [Subteams](#subteams)
   - [Events (Calendar)](#events-calendar)
   - [Event Attendance](#event-attendance)
   - [Messages](#messages)
   - [Team Links](#team-links)
   - [Team Media](#team-media)
   - [User Groups](#user-groups)
   - [User Preferences](#user-preferences)
4. [Common Patterns](#common-patterns)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## Introduction

This guide provides comprehensive documentation for integrating with the Xerosite API from mobile applications. The API follows RESTful principles and uses JSON for request/response bodies.

### Key Features

- JWT-based authentication
- Role-based access control
- Team management and collaboration
- Calendar events with recurrence support
- File attachments for messages and media
- Real-time visibility rules for content filtering

### Technology Stack

- **Backend:** NestJS (Node.js)
- **Database:** MySQL with TypeORM
- **Authentication:** JWT tokens
- **File Storage:** Local filesystem (configurable)

---

## Authentication

### Overview

The API uses JWT (JSON Web Tokens) for authentication. After successful login or registration, you'll receive an access token that must be included in subsequent requests.

### Token Usage

Include the JWT token in the `Authorization` header for all authenticated requests:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

#### 1. Register User (Simple)

**POST** `/auth/simple-register`

Register a new user with minimal information. Email verification is required before login.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "primaryEmail": "john.doe@example.com",
    "state": "pending",
    "isSiteAdmin": false,
    "emails": [...],
    "phones": [],
    "addresses": [],
    "createdAt": "2025-10-31T10:00:00.000Z",
    "updatedAt": "2025-10-31T10:00:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "You will be able to login once you verify your email."
}
```

#### 2. Register User (Full)

**POST** `/auth/register`

Register with complete profile information including multiple emails, phones, and addresses.

**Request Body:**
```json
{
  "firstName": "John",
  "middleName": "A",
  "lastName": "Doe",
  "password": "SecurePassword123!",
  "emails": [
    {
      "email": "john.doe@example.com",
      "emailType": "personal",
      "isPrimary": true
    }
  ],
  "phones": [
    {
      "phoneNumber": "+1234567890",
      "phoneType": "mobile",
      "isPrimary": true
    }
  ],
  "addresses": [
    {
      "streetLine1": "123 Main St",
      "streetLine2": "Apt 4",
      "city": "Portland",
      "stateProvince": "OR",
      "postalCode": "97201",
      "country": "USA",
      "addressType": "home",
      "isPrimary": true
    }
  ]
}
```

#### 3. Login

**POST** `/auth/login`

**Request Body:**
```json
{
  "username": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "primaryEmail": "john.doe@example.com",
    "state": "active",
    "isSiteAdmin": false,
    "lastLogin": "2025-10-31T10:00:00.000Z",
    ...
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**User States:**
- `pending`: Email verification required
- `active`: Normal user
- `admin`: Site administrator
- `inactive`: Account disabled

#### 4. Get Current User

**GET** `/auth/me`

Get the currently authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "primaryEmail": "john.doe@example.com",
  "state": "active",
  "isSiteAdmin": false,
  ...
}
```

#### 5. Email Verification

**GET** `/auth/verify-email?token=<verification-token>`

Verify user's email address. This endpoint redirects to the web application.

#### 6. Resend Verification Email

**POST** `/auth/resend-verification`

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

#### 7. Forgot Password

**POST** `/auth/forgot-password`

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset instructions sent to your email"
}
```

#### 8. Reset Password

**POST** `/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

---

## API Endpoints

### Health Check

#### Check API Status

**GET** `/health`

Check if the API is running and database is connected.

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

---

### Authentication & Users

#### Get All Users

**GET** `/users`

**Auth Required:** Yes

Get a list of all users in the system.

**Response:**
```json
[
  {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "primaryEmail": "john.doe@example.com",
    "state": "active",
    ...
  }
]
```

#### Get User by ID

**GET** `/users/:id`

**Auth Required:** Yes

#### Update User Profile

**PATCH** `/users/:id/profile`

**Auth Required:** Yes

**Request Body:**
```json
{
  "firstName": "John",
  "middleName": "A",
  "lastName": "Doe",
  "emails": [
    {
      "id": "existing-email-id",
      "email": "john.doe@example.com",
      "emailType": "personal",
      "isPrimary": true
    }
  ],
  "phones": [...],
  "addresses": [...]
}
```

**Note:** To delete an email/phone/address, set its `id` to `null`.

#### Change Password

**PATCH** `/users/:id/password`

**Auth Required:** Yes

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### Admin Change Password

**PATCH** `/users/:id/admin-password`

**Auth Required:** Yes (Admin only)

**Request Body:**
```json
{
  "newPassword": "NewPassword123!"
}
```

#### Update User State

**PATCH** `/users/:id/state`

**Auth Required:** Yes (Admin only)

**Request Body:**
```json
{
  "state": "active"
}
```

Valid states: `pending`, `active`, `admin`, `inactive`

#### Toggle User Active Status

**PATCH** `/users/:id/active`

**Auth Required:** Yes (Admin only)

**Request Body:**
```json
{
  "isActive": false
}
```

#### Delete User

**DELETE** `/users/:id`

**Auth Required:** Yes (Admin only)

---

### Teams

#### Create Team

**POST** `/teams`

**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "Robotics Team 1425",
  "teamNumber": 1425,
  "description": "FIRST Robotics Competition Team",
  "visibility": "private",
  "timezone": "America/Los_Angeles",
  "roles": ["Mentor", "Student", "Parent"]
}
```

**Fields:**
- `visibility`: `"public"` or `"private"`
- `timezone`: IANA timezone string (e.g., "America/Los_Angeles")
- `roles`: Array of role names for the team

#### Get All Teams

**GET** `/teams`

**Auth Required:** Yes

Returns all teams the user is a member of.

#### Get Public Teams Available to User

**GET** `/teams/public/available`

**Auth Required:** Yes

Returns public teams that the user can request to join.

#### Get Site Statistics

**GET** `/teams/statistics`

**Auth Required:** Yes

**Response:**
```json
{
  "publicTeamsCount": 15,
  "privateTeamsCount": 42,
  "totalUsersCount": 1250
}
```

#### Get Team by ID

**GET** `/teams/:id`

**Auth Required:** Yes

#### Update Team

**PATCH** `/teams/:id`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "name": "Updated Team Name",
  "description": "Updated description",
  "visibility": "public",
  "timezone": "America/New_York"
}
```

#### Delete Team

**DELETE** `/teams/:id`

**Auth Required:** Yes (Team Admin)

#### Get Team Roles

**GET** `/teams/:id/roles`

**Auth Required:** Yes

**Response:**
```json
["Administrator", "Mentor", "Student", "Parent"]
```

#### Get Role Constraints

**GET** `/teams/:id/constraints`

**Auth Required:** Yes

Returns pairs of roles that cannot be assigned to the same user.

**Response:**
```json
{
  "constraints": [
    ["Student", "Mentor"],
    ["Student", "Parent"]
  ]
}
```

#### Update Role Constraints

**PATCH** `/teams/:id/constraints`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "constraints": [
    {
      "role1": "Student",
      "role2": "Mentor"
    }
  ]
}
```

---

### Team Members

#### Get Team Members

**GET** `/teams/:id/members`

**Auth Required:** Yes

**Response:**
```json
[
  {
    "userId": "uuid",
    "userName": "John Doe",
    "userEmail": "john.doe@example.com",
    "roles": ["Student"],
    "membershipStatus": "active",
    "isActive": true,
    "joinedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

**Membership Status:**
- `pending`: Join request pending approval
- `active`: Active member
- `inactive`: Membership suspended

#### Add Team Member

**POST** `/teams/:id/members`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "userId": "user-uuid",
  "roles": ["Student"]
}
```

#### Update Member Roles

**PATCH** `/teams/:teamId/members/:userId`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "roles": ["Student", "Team Lead"]
}
```

#### Update Member Status

**PATCH** `/teams/:teamId/members/:userId/status`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "membershipStatus": "active"
}
```

#### Update Member Attributes

**PATCH** `/teams/:teamId/members/:userId/attributes`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "isActive": true
}
```

#### Remove Team Member

**DELETE** `/teams/:teamId/members/:userId`

**Auth Required:** Yes (Team Admin)

#### Request to Join Team

**POST** `/teams/:id/request-join`

**Auth Required:** Yes

Request to join a public team. Admins will be notified.

---

### Team Invitations

#### Send Invitation

**POST** `/teams/:id/invitations`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "roles": ["Student"]
}
```

#### Get Team Invitations

**GET** `/teams/:id/invitations`

**Auth Required:** Yes (Team Admin)

Returns all pending invitations for the team.

#### Get User's Invitations

**GET** `/teams/invitations/user`

**Auth Required:** Yes

Returns all pending invitations for the current user.

#### Accept Invitation

**POST** `/teams/invitations/:id/accept`

**Auth Required:** Yes

#### Decline Invitation

**POST** `/teams/invitations/:id/decline`

**Auth Required:** Yes

---

### Subteams

Subteams are groups within a team (e.g., mechanical, programming, design).

#### Create Subteam

**POST** `/teams/:teamId/subteams`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "name": "Programming",
  "description": "Software development subteam",
  "validRoles": ["Student", "Mentor"],
  "leadPositions": [
    {
      "title": "Programming Lead",
      "requiredRole": "Student",
      "leadUserId": "user-uuid"
    }
  ]
}
```

#### Get Team Subteams

**GET** `/teams/:teamId/subteams`

**Auth Required:** Yes

#### Get Subteam Details

**GET** `/teams/:teamId/subteams/:subteamId`

**Auth Required:** Yes

#### Update Subteam

**PATCH** `/teams/:teamId/subteams/:subteamId`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "validRoles": ["Student", "Mentor", "Parent"]
}
```

#### Delete Subteam

**DELETE** `/teams/:teamId/subteams/:subteamId`

**Auth Required:** Yes (Team Admin)

#### Add Members to Subteam

**POST** `/teams/:teamId/subteams/:subteamId/members`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "userIds": ["user-uuid-1", "user-uuid-2"]
}
```

#### Remove Member from Subteam

**DELETE** `/teams/:teamId/subteams/:subteamId/members`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "userId": "user-uuid"
}
```

#### Update Lead Position

**PATCH** `/teams/:teamId/subteams/:subteamId/lead-positions`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "positionId": "position-uuid",
  "title": "Updated Title",
  "requiredRole": "Student",
  "leadUserId": "user-uuid"
}
```

#### Delete Lead Position

**DELETE** `/teams/:teamId/subteams/:subteamId/lead-positions/:positionId`

**Auth Required:** Yes (Team Admin)

---

### Events (Calendar)

#### Create Event

**POST** `/teams/:teamId/events`

**Auth Required:** Yes (Requires scheduling permission)

**Request Body:**
```json
{
  "name": "Weekly Team Meeting",
  "description": "Regular team meeting",
  "location": "Lab Room 101",
  "startDateTime": "2025-11-01T15:00:00",
  "endDateTime": "2025-11-01T17:00:00",
  "recurrenceType": "weekly",
  "recurrencePattern": {
    "daysOfWeek": [1, 3, 5]
  },
  "recurrenceEndDate": "2025-12-31",
  "userGroupId": "group-uuid"
}
```

**Recurrence Types:**
- `none`: One-time event
- `daily`: Repeats daily
- `weekly`: Repeats weekly
- `monthly`: Repeats monthly
- `yearly`: Repeats yearly

**Recurrence Pattern Examples:**

Daily:
```json
{
  "interval": 2
}
```

Weekly (Monday, Wednesday, Friday):
```json
{
  "daysOfWeek": [1, 3, 5]
}
```

Monthly (15th of each month):
```json
{
  "daysOfMonth": [15]
}
```

Monthly (2nd Tuesday):
```json
{
  "weekOfMonth": 2,
  "dayOfWeek": 2
}
```

#### Get Team Events

**GET** `/teams/:teamId/events`

**Auth Required:** Yes

**Query Parameters:**
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Response:**
```json
[
  {
    "id": "uuid",
    "teamId": "team-uuid",
    "name": "Team Meeting",
    "description": "Weekly meeting",
    "location": "Lab Room 101",
    "startDateTime": "2025-11-01T15:00:00.000Z",
    "endDateTime": "2025-11-01T17:00:00.000Z",
    "recurrenceType": "weekly",
    "recurrencePattern": {...},
    "recurrenceEndDate": "2025-12-31",
    "timezone": "America/Los_Angeles",
    "userGroupId": "group-uuid",
    "excludedDates": ["2025-11-15"],
    "createdBy": "user-uuid",
    "createdAt": "2025-10-31T10:00:00.000Z",
    "updatedAt": "2025-10-31T10:00:00.000Z"
  }
]
```

#### Get Event by ID

**GET** `/teams/:teamId/events/:id`

**Auth Required:** Yes

#### Update Event

**PATCH** `/teams/:teamId/events/:id`

**Auth Required:** Yes (Event creator or admin)

Updates affect all future occurrences of recurring events.

**Request Body:**
```json
{
  "name": "Updated Meeting Name",
  "location": "New Location",
  "startDateTime": "2025-11-01T16:00:00"
}
```

#### Delete Event

**DELETE** `/teams/:teamId/events/:id`

**Auth Required:** Yes (Event creator or admin)

**Query Parameters:**
- `occurrenceDate`: ISO date string (optional) - Delete only this occurrence

Examples:
```
DELETE /teams/:teamId/events/:id
```
Deletes the entire event (or all future occurrences).

```
DELETE /teams/:teamId/events/:id?occurrenceDate=2025-11-15
```
Deletes only the November 15th occurrence (adds to excludedDates).

---

### Event Attendance

#### Get User Attendance for Date Range

**GET** `/teams/:teamId/events/attendance/range`

**Auth Required:** Yes

**Query Parameters:**
- `startDate`: ISO date string (required)
- `endDate`: ISO date string (required)

**Response:**
```json
[
  {
    "id": "uuid",
    "eventId": "event-uuid",
    "userId": "user-uuid",
    "instanceDate": "2025-11-01",
    "attendance": "yes",
    "createdAt": "2025-10-31T10:00:00.000Z",
    "updatedAt": "2025-10-31T10:00:00.000Z"
  }
]
```

**Attendance Values:**
- `yes`: Attending
- `no`: Not attending
- `not_sure`: Maybe attending

#### Update Attendance

**PATCH** `/teams/:teamId/events/:id/attendance`

**Auth Required:** Yes

**Request Body:**
```json
{
  "instanceDate": "2025-11-01",
  "attendance": "yes"
}
```

#### Get Event Instance Attendance

**GET** `/teams/:teamId/events/:id/attendance/:instanceDate`

**Auth Required:** Yes

Returns attendance records for all users for a specific event instance.

**Response:**
```json
[
  {
    "id": "uuid",
    "eventId": "event-uuid",
    "userId": "user-uuid",
    "userName": "John Doe",
    "instanceDate": "2025-11-01",
    "attendance": "yes",
    "createdAt": "2025-10-31T10:00:00.000Z",
    "updatedAt": "2025-10-31T10:00:00.000Z"
  }
]
```

---

### Messages

Messages support rich content and file attachments.

#### Send Message

**POST** `/teams/:teamId/messages`

**Auth Required:** Yes

**Content-Type:** `multipart/form-data` (when including attachments) or `application/json`

**Form Fields:**
- `subject`: Message subject (required)
- `content`: Message body (required)
- `recipientType`: `"all"`, `"user_group"` (required)
- `userGroupId`: UUID (required if recipientType is "user_group")
- `attachments`: File(s) (optional, max 10 files, 50MB total)

**Example (JSON without attachments):**
```json
{
  "subject": "Important Update",
  "content": "Team meeting rescheduled to 3pm",
  "recipientType": "all"
}
```

**Example (FormData with attachments):**
```javascript
const formData = new FormData();
formData.append('subject', 'Weekly Report');
formData.append('content', 'Please see attached documents');
formData.append('recipientType', 'user_group');
formData.append('userGroupId', 'group-uuid');
formData.append('attachments', file1);
formData.append('attachments', file2);
```

**Response:**
```json
{
  "id": "uuid",
  "teamId": "team-uuid",
  "senderId": "user-uuid",
  "senderName": "John Doe",
  "subject": "Important Update",
  "content": "Message body",
  "recipientType": "all",
  "userGroupId": null,
  "attachments": [
    {
      "id": "file-uuid",
      "filename": "report.pdf",
      "mimeType": "application/pdf",
      "fileSize": 245678
    }
  ],
  "sentAt": "2025-10-31T10:00:00.000Z"
}
```

#### Get Team Messages

**GET** `/teams/:teamId/messages`

**Auth Required:** Yes

**Query Parameters:**
- `limit`: Number (default: 50)
- `offset`: Number (default: 0)
- `status`: `"sent"`, `"failed"` (optional)

Returns messages visible to the current user based on visibility rules.

#### Download Message Attachment

**GET** `/teams/:teamId/messages/:messageId/attachments/:fileId/download`

**Auth Required:** Yes

Downloads the file with appropriate headers.

---

### Team Links

Useful links displayed on team dashboard (e.g., The Blue Alliance, Statbotics).

#### Create Link

**POST** `/teams/:teamId/links`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "title": "Team Website",
  "url": "https://team1425.com",
  "displayOrder": 0
}
```

#### Get Team Links

**GET** `/teams/:teamId/links`

**Auth Required:** Yes

**Response:**
```json
[
  {
    "id": "uuid",
    "teamId": "team-uuid",
    "title": "The Blue Alliance",
    "url": "https://www.thebluealliance.com/team/1425",
    "displayOrder": 0,
    "createdAt": "2025-10-31T10:00:00.000Z"
  }
]
```

#### Update Link

**PATCH** `/teams/:teamId/links/:id`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "title": "Updated Title",
  "url": "https://newurl.com",
  "displayOrder": 1
}
```

#### Delete Link

**DELETE** `/teams/:teamId/links/:id`

**Auth Required:** Yes (Team Admin)

---

### Team Media

Upload and manage team photos, documents, and other media files.

#### Upload Media File

**POST** `/teams/:teamId/media`

**Auth Required:** Yes (Team Admin or members with permission)

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file`: File (required)
- `title`: String (required)
- `displayOrder`: Number (optional)

**Response:**
```json
{
  "id": "uuid",
  "teamId": "team-uuid",
  "title": "Team Photo 2025",
  "filename": "photo_2025.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 1234567,
  "uploadedBy": "user-uuid",
  "displayOrder": 0,
  "createdAt": "2025-10-31T10:00:00.000Z"
}
```

#### Get Team Media

**GET** `/teams/:teamId/media`

**Auth Required:** Yes

**Response:**
```json
[
  {
    "id": "uuid",
    "teamId": "team-uuid",
    "title": "Team Photo",
    "filename": "photo.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 1234567,
    "uploadedBy": "user-uuid",
    "displayOrder": 0,
    "createdAt": "2025-10-31T10:00:00.000Z"
  }
]
```

#### Update Media Title

**PATCH** `/teams/:teamId/media/:id`

**Auth Required:** Yes (Uploader or admin)

**Request Body:**
```json
{
  "title": "Updated Title",
  "displayOrder": 1
}
```

#### Delete Media

**DELETE** `/teams/:teamId/media/:id`

**Auth Required:** Yes (Uploader or admin)

#### Download Media File

**GET** `/teams/:teamId/media/:id/download`

**Auth Required:** Yes

Downloads the file with `Content-Disposition: attachment`.

#### Preview Media File

**GET** `/teams/:teamId/media/:id/preview`

**Auth Required:** Yes

Returns the file with `Content-Disposition: inline` for in-browser viewing.

---

### User Groups

User groups allow filtering and targeting of messages/events to specific sets of users based on criteria.

#### Create User Group

**POST** `/teams/:teamId/user-groups`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "name": "Build Team Members",
  "description": "All members of the build subteam",
  "visibilityRules": {
    "ruleSet": {
      "operator": "AND",
      "rows": [
        {
          "criteriaType": "subteam_members",
          "subteamId": "subteam-uuid"
        },
        {
          "criteriaType": "roles",
          "roles": ["Student", "Mentor"]
        }
      ]
    }
  }
}
```

**Criteria Types:**
- `all_members`: All team members
- `roles`: Users with specific roles
- `subteam_members`: Members of a specific subteam
- `subteam_leads`: Lead positions in a subteam

**Operators:**
- `AND`: All conditions must match
- `OR`: Any condition must match

#### Get Team User Groups

**GET** `/teams/:teamId/user-groups`

**Auth Required:** Yes

#### Get User Group

**GET** `/teams/:teamId/user-groups/:id`

**Auth Required:** Yes

#### Update User Group

**PATCH** `/teams/:teamId/user-groups/:id`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "visibilityRules": {...}
}
```

#### Delete User Group

**DELETE** `/teams/:teamId/user-groups/:id`

**Auth Required:** Yes (Team Admin)

---

### User Preferences

#### Get User Preferences

**GET** `/preferences`

**Auth Required:** Yes

**Response:**
```json
{
  "userId": "user-uuid",
  "theme": "light",
  "language": "en",
  "emailNotifications": true,
  "smsNotifications": false,
  "dashboardLayout": "grid",
  "createdAt": "2025-10-31T10:00:00.000Z",
  "updatedAt": "2025-10-31T10:00:00.000Z"
}
```

#### Update User Preferences

**PUT** `/preferences`

**Auth Required:** Yes

**Request Body:**
```json
{
  "theme": "dark",
  "emailNotifications": false,
  "dashboardLayout": "list"
}
```

---

### Import/Export

#### Import Roster

**POST** `/teams/:id/import-roster`

**Auth Required:** Yes (Team Admin)

Bulk import users from structured data.

**Request Body:**
```json
{
  "users": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "roles": ["Student"],
      "defaultPassword": "TempPass123!",
      "membershipStatus": "active"
    }
  ],
  "sendInviteEmails": true
}
```

**Response:**
```json
{
  "success": true,
  "importedCount": 25,
  "failedCount": 2,
  "errors": [
    {
      "email": "invalid@example",
      "error": "Invalid email format"
    }
  ]
}
```

#### Export Users

**POST** `/teams/:id/export/users`

**Auth Required:** Yes (Team Admin)

**Request Body:**
```json
{
  "fields": ["name", "email", "roles", "phone"],
  "includeSubteams": true
}
```

**Response:** CSV file download

---

## Common Patterns

### Pagination

For endpoints that return large lists, use query parameters:

```
GET /teams/:id/messages?limit=20&offset=40
```

### Filtering

Many endpoints support filtering:

```
GET /teams/:id/events?startDate=2025-11-01&endDate=2025-11-30
GET /teams/:id/messages?status=sent
```

### Sorting

Results are typically sorted by:
- Events: `startDateTime` ascending
- Messages: `sentAt` descending
- Members: `userName` ascending

### Date/Time Handling

- All timestamps are in ISO 8601 format: `2025-10-31T10:00:00.000Z`
- Dates are in ISO format: `2025-10-31`
- Timezones are specified using IANA timezone database names (e.g., "America/Los_Angeles")
- Event times are stored in the team's timezone

### File Uploads

Use `multipart/form-data` for file uploads:

```javascript
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('title', 'My File');

fetch('/teams/:teamId/media', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

---

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `204 No Content`: Successful request with no response body
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or token invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate email)
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### Common Error Scenarios

#### 1. Authentication Errors

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Solution:** Ensure JWT token is included and valid. Re-authenticate if token expired.

#### 2. Validation Errors

```json
{
  "statusCode": 400,
  "message": "firstName must be a string, email must be a valid email address"
}
```

**Solution:** Check request body matches required schema.

#### 3. Permission Errors

```json
{
  "statusCode": 403,
  "message": "Only team administrators can perform this action"
}
```

**Solution:** User lacks required permissions for this operation.

#### 4. Resource Not Found

```json
{
  "statusCode": 404,
  "message": "Team with id abc-123 not found"
}
```

**Solution:** Verify the resource ID exists and user has access.

---

## Best Practices

### 1. Token Management

- Store JWT tokens securely (encrypted storage, not in plain text)
- Refresh tokens before expiration
- Clear tokens on logout
- Handle 401 errors by prompting re-authentication

### 2. Error Handling

- Always handle network errors gracefully
- Implement retry logic for transient failures
- Display user-friendly error messages
- Log errors for debugging

### 3. Performance

- Cache frequently accessed data (teams, roles)
- Use pagination for large lists
- Implement pull-to-refresh for real-time data
- Compress images before upload
- Use date range queries to limit event fetches

### 4. Offline Support

- Cache critical data locally
- Queue operations when offline
- Sync when connection restored
- Indicate offline status to users

### 5. File Handling

- Validate file types before upload
- Check file size limits (50MB for attachments)
- Show upload progress
- Handle upload failures gracefully

### 6. Security

- Never store passwords in the app
- Use HTTPS in production
- Validate all user input
- Sanitize HTML content in messages
- Implement certificate pinning for production

### 7. User Experience

- Show loading indicators
- Implement optimistic updates
- Provide clear success/error feedback
- Handle deep links for email verification/password reset
- Support offline mode gracefully

### 8. Data Refresh

- Poll for new messages/events periodically
- Implement push notifications for important updates
- Refresh data on app foreground
- Use Last-Modified headers for conditional requests

### 9. Testing

- Test with various network conditions
- Test with expired tokens
- Test file upload edge cases
- Test with large data sets
- Test permission scenarios

---

## Example Mobile Implementation

### Swift (iOS) Example

```swift
import Foundation

class XerositeAPIClient {
    let baseURL = "https://your-domain.com/api"
    var authToken: String?
    
    func login(email: String, password: String) async throws -> User {
        let url = URL(string: "\(baseURL)/auth/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["username": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.unauthorized
        }
        
        let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
        self.authToken = loginResponse.access_token
        return loginResponse.user
    }
    
    func getTeams() async throws -> [Team] {
        guard let token = authToken else {
            throw APIError.unauthorized
        }
        
        let url = URL(string: "\(baseURL)/teams")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.networkError
        }
        
        return try JSONDecoder().decode([Team].self, from: data)
    }
}
```

### Kotlin (Android) Example

```kotlin
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

interface XerositeAPI {
    @POST("auth/login")
    suspend fun login(@Body credentials: LoginRequest): LoginResponse
    
    @GET("teams")
    suspend fun getTeams(@Header("Authorization") token: String): List<Team>
    
    @GET("teams/{teamId}/events")
    suspend fun getEvents(
        @Path("teamId") teamId: String,
        @Header("Authorization") token: String,
        @Query("startDate") startDate: String?,
        @Query("endDate") endDate: String?
    ): List<Event>
}

class XerositeClient {
    private val retrofit = Retrofit.Builder()
        .baseUrl("https://your-domain.com/api/")
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    private val api = retrofit.create(XerositeAPI::class.java)
    private var authToken: String? = null
    
    suspend fun login(email: String, password: String): User {
        val response = api.login(LoginRequest(email, password))
        authToken = response.access_token
        return response.user
    }
    
    suspend fun getTeams(): List<Team> {
        val token = authToken ?: throw IllegalStateException("Not authenticated")
        return api.getTeams("Bearer $token")
    }
}
```

---

## Support and Feedback

For API issues, feature requests, or questions:

- **GitHub:** [github.com/sjcbulldog/xerosite](https://github.com/sjcbulldog/xerosite)
- **Email:** support@xerosite.com
- **Documentation:** This guide and source code comments

---

## Changelog

### Version 1.0 (October 31, 2025)
- Initial API documentation
- All core features documented
- Authentication and authorization
- Teams, events, messages, and media
- User groups and preferences

---

## Appendix

### Timezone Examples

Common IANA timezone identifiers:
- `America/New_York` - Eastern Time
- `America/Chicago` - Central Time
- `America/Denver` - Mountain Time
- `America/Los_Angeles` - Pacific Time
- `America/Phoenix` - Arizona (no DST)
- `Europe/London` - GMT/BST
- `Asia/Tokyo` - Japan Standard Time

### Email Types

- `personal`
- `work`
- `school`
- `other`

### Phone Types

- `mobile`
- `home`
- `work`
- `other`

### Address Types

- `home`
- `work`
- `school`
- `other`

### MIME Types for Media

Common file types:
- Images: `image/jpeg`, `image/png`, `image/gif`
- Documents: `application/pdf`, `application/msword`
- Spreadsheets: `application/vnd.ms-excel`
- Videos: `video/mp4`, `video/quicktime`

---

**End of Mobile API Guide**
