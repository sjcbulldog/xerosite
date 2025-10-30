# Xerosite REST API Documentation

## Overview

The Xerosite API is a RESTful API built with NestJS that provides endpoints for managing FRC team operations, including user management, team administration, event scheduling, messaging, and more.

**Base URL:** `http://HOSTNAME/api` (development)

**API Prefix:** All API endpoints are prefixed with `/api`

---

## Authentication

### Overview

The API uses **JWT (JSON Web Token)** authentication. After successful login or registration, clients receive an access token that must be included in subsequent requests.

### Authentication Flow

1. **Register** or **Login** to receive an access token
2. Include the token in the `Authorization` header for protected endpoints
3. Token expires after 24 hours (configurable)

### Token Format

```
Authorization: Bearer <access_token>
```

### Public Endpoints (No Authentication Required)

- `POST /api/auth/register` - User registration
- `POST /api/auth/simple-register` - Simplified registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email` - Email verification
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/health` - Health check

### Protected Endpoints

All other endpoints require a valid JWT token in the Authorization header.

---

## API Endpoints

### Authentication (`/api/auth`)

#### Register User

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "middleName": "A",
  "password": "securePassword123",
  "emails": [
    {
      "email": "john.doe@example.com",
      "emailType": "personal",
      "isPrimary": true
    }
  ],
  "phones": [
    {
      "phoneNumber": "5551234567",
      "phoneType": "mobile",
      "countryCode": "+1",
      "isPrimary": true
    }
  ],
  "addresses": [
    {
      "streetLine1": "123 Main St",
      "city": "Springfield",
      "stateProvince": "OR",
      "postalCode": "97477",
      "country": "USA",
      "addressType": "home",
      "isPrimary": true
    }
  ]
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "state": "pending",
    "emails": [...],
    "createdAt": "2025-10-29T00:00:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Simple Register

```http
POST /api/auth/simple-register
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "password": "securePassword123",
  "phone": "5559876543",
  "address": "456 Oak Ave",
  "city": "Eugene",
  "state": "OR",
  "zipCode": "97401"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "Jane",
    "lastName": "Smith",
    "state": "pending"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "You will be able to login once you verify your email."
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "state": "active",
    "isSiteAdmin": false,
    "primaryEmail": "john.doe@example.com"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "state": "active",
  "primaryEmail": "john.doe@example.com",
  "isSiteAdmin": false,
  "emails": [...],
  "phones": [...],
  "addresses": [...]
}
```

#### Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

#### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successful"
}
```

---

### Users (`/api/users`)

All user endpoints require authentication.

#### Get All Users

```http
GET /api/users
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "primaryEmail": "john@example.com",
    "state": "active"
  }
]
```

#### Get User by ID

```http
GET /api/users/:id
Authorization: Bearer <access_token>
```

#### Update User Profile

```http
PATCH /api/users/:id/profile
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "emails": [
    {
      "email": "newemail@example.com",
      "emailType": "personal",
      "isPrimary": true
    }
  ],
  "phones": [...],
  "addresses": [...]
}
```

#### Change User State (Admin Only)

```http
PATCH /api/users/:id/state
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "state": "active"
}
```

Valid states: `pending`, `active`, `admin`, `disabled`

#### Change Password

```http
PATCH /api/users/:id/password
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "currentPassword123",
  "newPassword": "newPassword123"
}
```

#### Delete User

```http
DELETE /api/users/:id
Authorization: Bearer <access_token>
```

---

### Teams (`/api/teams`)

All team endpoints require authentication.

#### Create Team

```http
POST /api/teams
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Team Error Code Xero",
  "teamNumber": 1425,
  "description": "FRC Team 1425 from Oregon",
  "roles": ["Administrator", "Mentor", "Student", "Parent"],
  "visibility": "public"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Team Error Code Xero",
  "teamNumber": 1425,
  "description": "FRC Team 1425 from Oregon",
  "roles": ["Administrator", "Mentor", "Student", "Parent"],
  "visibility": "public",
  "createdAt": "2025-10-29T00:00:00.000Z"
}
```

#### Get All Teams

```http
GET /api/teams
Authorization: Bearer <access_token>
```

#### Get Site Statistics

```http
GET /api/teams/statistics
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "publicTeamsCount": 15,
  "privateTeamsCount": 8,
  "totalUsersCount": 342
}
```

#### Get Public Teams Available to Join

```http
GET /api/teams/public/available
Authorization: Bearer <access_token>
```

Returns public teams that the current user is not already a member of.

#### Get Team by ID

```http
GET /api/teams/:id
Authorization: Bearer <access_token>
```

#### Update Team

```http
PATCH /api/teams/:id
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "Updated team description",
  "roles": ["Administrator", "Mentor", "Student", "Parent", "Alumni"],
  "visibility": "private"
}
```

#### Delete Team

```http
DELETE /api/teams/:id
Authorization: Bearer <access_token>
```

#### Get Team Members

```http
GET /api/teams/:id/members
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "userId": "uuid",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "roles": ["Student", "Programming"],
    "status": "active"
  }
]
```

#### Add Team Member

```http
POST /api/teams/:id/members
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "uuid",
  "roles": ["Student"]
}
```

#### Update Member Roles

```http
PATCH /api/teams/:id/members/:userId/roles
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "roles": ["Student", "Programming Lead"]
}
```

#### Update Member Status

```http
PATCH /api/teams/:id/members/:userId/status
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "active"
}
```

Valid statuses: `pending`, `active`, `disabled`

#### Remove Team Member

```http
DELETE /api/teams/:id/members/:userId
Authorization: Bearer <access_token>
```

#### Send Team Invitation

```http
POST /api/teams/:id/invitations
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newmember@example.com"
}
```

#### Get Team Invitations

```http
GET /api/teams/:id/invitations
Authorization: Bearer <access_token>
```

#### Get User's Invitations

```http
GET /api/teams/invitations/user
Authorization: Bearer <access_token>
```

#### Accept Invitation

```http
POST /api/teams/invitations/:id/accept
Authorization: Bearer <access_token>
```

#### Decline Invitation

```http
POST /api/teams/invitations/:id/decline
Authorization: Bearer <access_token>
```

#### Get User Permissions

```http
GET /api/teams/:id/members/:userId/permissions
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "permission": "SEND_MESSAGES",
    "enabled": true
  },
  {
    "permission": "SCHEDULE_EVENTS",
    "enabled": false
  }
]
```

#### Update User Permission

```http
PATCH /api/teams/:id/members/:userId/permissions/:permission
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "enabled": true
}
```

Valid permissions: `SEND_MESSAGES`, `SCHEDULE_EVENTS`, `CREATE_PUBLIC_USER_GROUPS`

#### Import Team Roster

```http
POST /api/teams/:id/import-roster
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "members": [
    {
      "first": "John",
      "last": "Doe",
      "email": "john@example.com",
      "phoneNumber": "5551234567",
      "address": "123 Main St",
      "city": "Springfield",
      "state": "OR",
      "zip": "97477"
    }
  ],
  "defaultPassword": "tempPassword123"
}
```

#### Export Team Users

```http
POST /api/teams/:id/export
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fields": ["firstName", "lastName", "email", "phone"],
  "includeSubteams": true
}
```

**Response:** CSV file download

---

### Subteams (`/api/teams/:teamId/subteams`)

All subteam endpoints require authentication.

#### Create Subteam

```http
POST /api/teams/:teamId/subteams
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Programming",
  "description": "Software development subteam",
  "validRoles": ["Student", "Mentor"]
}
```

#### Get Team Subteams

```http
GET /api/teams/:teamId/subteams
Authorization: Bearer <access_token>
```

#### Get Subteam by ID

```http
GET /api/teams/:teamId/subteams/:subteamId
Authorization: Bearer <access_token>
```

#### Update Subteam

```http
PATCH /api/teams/:teamId/subteams/:subteamId
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Delete Subteam

```http
DELETE /api/teams/:teamId/subteams/:subteamId
Authorization: Bearer <access_token>
```

#### Add Subteam Members

```http
POST /api/teams/:teamId/subteams/:subteamId/members
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userIds": ["uuid1", "uuid2"]
}
```

#### Remove Subteam Member

```http
DELETE /api/teams/:teamId/subteams/:subteamId/members
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "uuid"
}
```

#### Update Lead Position

```http
PATCH /api/teams/:teamId/subteams/:subteamId/lead-positions
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "positionId": "uuid",
  "userId": "uuid"
}
```

---

### User Groups (`/api/teams/:teamId/user-groups`)

All user group endpoints require authentication.

#### Create User Group

```http
POST /api/teams/:teamId/user-groups
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Competition Team",
  "isPublic": false,
  "visibilityRules": {
    "rows": [
      {
        "id": "1",
        "criteria": [
          {
            "type": "select_users",
            "userIds": ["uuid1", "uuid2"]
          }
        ]
      }
    ]
  }
}
```

#### Get User Groups

```http
GET /api/teams/:teamId/user-groups
Authorization: Bearer <access_token>
```

Returns all public groups and the user's private groups.

#### Get User Group by ID

```http
GET /api/teams/:teamId/user-groups/:id
Authorization: Bearer <access_token>
```

#### Update User Group

```http
PATCH /api/teams/:teamId/user-groups/:id
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Delete User Group

```http
DELETE /api/teams/:teamId/user-groups/:id
Authorization: Bearer <access_token>
```

---

### Events (`/api/teams/:teamId/events`)

All event endpoints require authentication.

#### Create Event

```http
POST /api/teams/:teamId/events
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Competition Kickoff",
  "description": "Season kickoff event",
  "location": "School Auditorium",
  "startDateTime": "2025-11-01T18:00:00.000Z",
  "endDateTime": "2025-11-01T20:00:00.000Z",
  "recurrenceType": "none",
  "userGroupId": "uuid"
}
```

**Recurrence Types:** `none`, `daily`, `weekly`, `monthly`, `custom`

#### Get Team Events

```http
GET /api/teams/:teamId/events
Authorization: Bearer <access_token>
```

Optional query parameters:
- `startDate`: ISO date string
- `endDate`: ISO date string

```http
GET /api/teams/:teamId/events?startDate=2025-11-01&endDate=2025-11-30
```

#### Get Event by ID

```http
GET /api/teams/:teamId/events/:id
Authorization: Bearer <access_token>
```

#### Update Event

```http
PATCH /api/teams/:teamId/events/:id
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Delete Event

```http
DELETE /api/teams/:teamId/events/:id
Authorization: Bearer <access_token>
```

#### Get User Attendance for Date Range

```http
GET /api/teams/:teamId/events/attendance/range?startDate=2025-11-01&endDate=2025-11-30
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "eventId": "uuid",
    "userId": "uuid",
    "instanceDate": "2025-11-01T18:00:00.000Z",
    "attendance": "yes"
  }
]
```

Attendance values: `yes`, `no`, `not-sure`

#### Update Event Attendance

```http
PATCH /api/teams/:teamId/events/:id/attendance
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventId": "uuid",
  "instanceDate": "2025-11-01T18:00:00.000Z",
  "attendance": "yes"
}
```

#### Get Event Attendance

```http
GET /api/teams/:teamId/events/:id/attendance/:instanceDate
Authorization: Bearer <access_token>
```

---

### Messages (`/api/teams/:teamId/messages`)

All message endpoints require authentication and the `SEND_MESSAGES` permission (or Administrator role).

#### Send Message

```http
POST /api/teams/:teamId/messages
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "Practice Reminder",
  "content": "Don't forget about practice tomorrow at 6 PM!",
  "recipientType": "ALL_TEAM_MEMBERS"
}
```

Or with user group:

```json
{
  "subject": "Competition Team Meeting",
  "content": "Special meeting for competition team members.",
  "recipientType": "USER_GROUP",
  "userGroupId": "uuid"
}
```

**Recipient Types:** `ALL_TEAM_MEMBERS`, `USER_GROUP`

**Response:**
```json
{
  "id": "uuid",
  "teamId": "uuid",
  "senderId": "uuid",
  "senderName": "John Doe",
  "subject": "Practice Reminder",
  "content": "Don't forget about practice tomorrow at 6 PM!",
  "recipientType": "ALL_TEAM_MEMBERS",
  "recipientCount": 25,
  "sentAt": "2025-10-29T12:00:00.000Z"
}
```

#### Get Team Messages

```http
GET /api/teams/:teamId/messages
Authorization: Bearer <access_token>
```

Returns messages sent by or to the current user.

Optional query parameters:
- `search`: Search in subject or content
- `startDate`: Filter by date (ISO string)
- `endDate`: Filter by date (ISO string)

```http
GET /api/teams/:teamId/messages?search=practice&startDate=2025-10-01
```

**Response:**
```json
[
  {
    "id": "uuid",
    "teamId": "uuid",
    "senderId": "uuid",
    "senderName": "John Doe",
    "senderEmail": "john@example.com",
    "subject": "Practice Reminder",
    "content": "Message content...",
    "recipientType": "ALL_TEAM_MEMBERS",
    "recipientCount": 25,
    "sentAt": "2025-10-29T12:00:00.000Z",
    "createdAt": "2025-10-29T12:00:00.000Z"
  }
]
```

---

### Preferences (`/api/preferences`)

All preference endpoints require authentication.

#### Get User Preferences

```http
GET /api/preferences
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "eventNotifications": [
    {
      "timeBefore": 60,
      "method": "email"
    },
    {
      "timeBefore": 1440,
      "method": "text"
    }
  ],
  "messageDeliveryMethod": "email",
  "createdAt": "2025-10-29T00:00:00.000Z",
  "updatedAt": "2025-10-29T00:00:00.000Z"
}
```

#### Update User Preferences

```http
PUT /api/preferences
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventNotifications": [
    {
      "timeBefore": 60,
      "method": "email"
    },
    {
      "timeBefore": 1440,
      "method": "text"
    }
  ],
  "messageDeliveryMethod": "text"
}
```

**Time Before Values (in minutes):**
- `15` - 15 minutes
- `30` - 30 minutes
- `60` - 1 hour
- `120` - 2 hours
- `1440` - 1 day
- `2880` - 2 days
- `10080` - 1 week

**Methods:** `email`, `text`

---

### Admin (`/api/admin`)

All admin endpoints require authentication and site administrator privileges.

#### Send Test Message

```http
POST /api/admin/test-message
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "deliveryMethod": "email",
  "recipient": "test@example.com",
  "message": "This is a test message"
}
```

**Delivery Methods:** `email`, `text`

**Response:**
```json
{
  "success": true,
  "message": "Test message sent successfully"
}
```

---

### Health Check (`/api/health`)

No authentication required.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-29T12:00:00.000Z",
  "database": {
    "connected": true
  }
}
```

---

## Error Responses

All endpoints return standard HTTP status codes and error messages.

### Common Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User doesn't have permission
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate email)
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

Or with validation details:

```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be at least 8 characters"
  ],
  "error": "Bad Request"
}
```

---

## Data Types and Enums

### User States

- `pending` - User registered but email not verified
- `active` - Active user with full access
- `admin` - Site administrator with elevated privileges
- `disabled` - Account disabled

### Team Visibility

- `public` - Team visible to all users
- `private` - Team visible only to members

### Membership Status

- `pending` - User invited but not yet accepted
- `active` - Active team member
- `disabled` - Membership disabled

### Team Permissions

- `SEND_MESSAGES` - Can send team messages
- `SCHEDULE_EVENTS` - Can create and manage events
- `CREATE_PUBLIC_USER_GROUPS` - Can create public user groups

### Recurrence Types

- `none` - Non-recurring event
- `daily` - Repeats daily
- `weekly` - Repeats weekly
- `monthly` - Repeats monthly
- `custom` - Custom recurrence pattern

### Attendance Status

- `yes` - Attending
- `no` - Not attending
- `not-sure` - Maybe attending

### Message Recipient Types

- `ALL_TEAM_MEMBERS` - Send to all active team members
- `USER_GROUP` - Send to specific user group

---

## Rate Limiting

Email sending is rate-limited to prevent abuse. The default limit is 12 emails per user per time period (configurable via `EMAIL_RATE_LIMIT` environment variable).

---

## CORS

CORS is enabled for all origins in development. Configure appropriately for production environments.

---

## Pagination

Currently, list endpoints return all matching results. Future versions may implement pagination for large datasets.

---

## Webhooks

Webhook functionality is not currently implemented but may be added in future versions for event notifications.

---

## SDK and Client Libraries

Currently, no official SDK is provided. The frontend Angular application serves as a reference implementation for API integration.

---

## Support

For questions or issues with the API, please contact the development team or file an issue in the project repository.

---

**Last Updated:** October 29, 2025
**API Version:** 1.0.0
