# Email Verification System

## Overview

New users (after the first user) are automatically set to a `pending` state upon registration. They must verify their email address before they can log in. The first user is automatically set to `admin` state.

## Configuration

Add the following environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.comcast.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=butchg@comcast.net
EMAIL_PASSWORD=Meridian$$1970
EMAIL_FROM=butchg@comcast.net
APP_URL=http://localhost:4200
```

### Gmail Configuration

If using Gmail:
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password (not your regular password) for `EMAIL_PASSWORD`

### Other Email Providers

For other SMTP providers, adjust:
- `EMAIL_HOST`: Your SMTP server hostname
- `EMAIL_PORT`: Usually 587 (TLS) or 465 (SSL)
- `EMAIL_SECURE`: Set to `true` for port 465, `false` for port 587

## User Flow

### Registration
1. User registers with email, first name, last name, and password
2. If this is the **first user**:
   - User state is set to `admin`
   - No verification email is sent
   - User can log in immediately
3. If this is a **subsequent user**:
   - User state is set to `pending`
   - Verification email is sent to their email address
   - User cannot log in until email is verified

### Email Verification
1. User receives email with verification link
2. User clicks link: `{API_URL}/api/auth/verify-email?token={token}`
3. Backend validates token and updates user state to `active`
4. Backend redirects to frontend with success message or returns JSON
5. Welcome email is sent to user
6. User can now log in

### Resend Verification Email
If user didn't receive the email or it expired:
- Call `POST /api/auth/resend-verification` with body: `{ "email": "user@example.com" }`
- New verification token is generated and emailed

## API Endpoints

### `GET /api/auth/verify-email?token={token}`
Verifies user email address

**Query Parameters:**
- `token` (string, required): Verification token from email

**Response:**
```json
{
  "user": { /* UserResponseDto */ },
  "message": "Email verified successfully"
}
```

### `POST /api/auth/resend-verification`
Resends verification email

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Verification email sent"
}
```

## Database Schema

### `email_verification_tokens` Table
- `id`: UUID primary key
- `token`: VARCHAR(255) - Verification token (32 random bytes as hex)
- `userId`: UUID - Foreign key to users table
- `expiresAt`: DATETIME - Token expiration (24 hours from creation)
- `isUsed`: BOOLEAN - Whether token has been used
- `usedAt`: DATETIME - When token was used
- `createdAt`: DATETIME - When token was created
- `updatedAt`: DATETIME - Last update timestamp

## Email Templates

Templates are located in `src/modules/email/templates/`:

- **verification.hbs**: Email sent with verification link
- **welcome.hbs**: Email sent after successful verification

Templates use Handlebars syntax and can access context variables:
- `firstName`: User's first name
- `verificationUrl`: Full verification URL (for verification email)

## Security Features

- Tokens are 32-byte cryptographically random strings (64 hex characters)
- Tokens expire after 24 hours
- Tokens are single-use (marked as `isUsed` after verification)
- Old tokens are invalidated when resending verification email
- Users in `pending` state cannot log in

## Development Testing

For development without actual email sending, you can:

1. **Use Ethereal Email** (fake SMTP service):
   ```typescript
   // In development, log the verification URL instead of sending email
   console.log(`Verification URL: ${verificationUrl}`);
   ```

2. **Use MailHog** (local email testing):
   ```env
   EMAIL_HOST=localhost
   EMAIL_PORT=1025
   EMAIL_SECURE=false
   EMAIL_USER=
   EMAIL_PASSWORD=
   ```

3. **Manually verify users** via database:
   ```sql
   UPDATE users SET state = 'active' WHERE primaryEmail = 'user@example.com';
   ```

## Frontend Implementation Notes

The frontend needs to:
1. Create a verify-email route/component
2. Extract token from URL query parameter
3. Call the verify-email endpoint
4. Show success/error messages
5. Redirect to login after successful verification
6. Provide UI to resend verification email if needed
