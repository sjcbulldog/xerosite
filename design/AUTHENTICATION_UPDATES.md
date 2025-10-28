# User Authentication Updates

## Changes Made

### UUID Primary Keys
- **User entity** now uses UUID as primary key instead of auto-increment integer
- **All related entities** (UserEmail, UserPhone, UserAddress) updated to use string foreign keys
- **Frontend interfaces** updated to use string IDs

### Email-Only Authentication
- **Username field completely removed** from User entity and all related code
- **All login is now email-based** - users log in with any of their registered email addresses
- **Backend authentication** validates users by email address only
- **No username concept** - email is the sole identifier for login
- **Frontend login form** uses email field exclusively

### Database Schema Changes
```sql
-- User table now uses UUID primary key (no username field)
users.id: UUID (generated automatically)
users.first_name: VARCHAR(100)
users.middle_name: VARCHAR(100) NULL
users.last_name: VARCHAR(100)
users.password: VARCHAR(255)
users.state: ENUM('pending', 'active', 'admin', 'disabled')
users.last_login: TIMESTAMP NULL
users.created_at: TIMESTAMP
users.updated_at: TIMESTAMP

-- Related tables use string foreign keys
user_emails.user_id: VARCHAR (references users.id)
user_phones.user_id: VARCHAR (references users.id) 
user_addresses.user_id: VARCHAR (references users.id)
```

### API Changes
- **User ID** is now string type (UUID) in all API responses
- **Login endpoint** accepts email address (username field removed)
- **JWT tokens** contain string user ID and email in payload (no username)
- **Registration** creates user with email as primary identifier (no username required)

### User Flow
1. **Registration**: User provides email/password → System creates UUID → User gets pending/admin/active state
2. **Login**: User provides any registered email + password → System validates → Returns JWT with UUID and email
3. **Authentication**: JWT contains UUID → System validates user exists and is active/admin

## Benefits
- **Simpler UX**: No username to remember - just email and password
- **More secure**: UUIDs are not predictable like sequential integers
- **Better UX**: Users can log in with any of their registered email addresses
- **Less confusion**: One less field to manage (no username/email confusion)
- **Scalable**: UUIDs work better in distributed systems
- **Flexible**: Email-based login is more intuitive and standard for users