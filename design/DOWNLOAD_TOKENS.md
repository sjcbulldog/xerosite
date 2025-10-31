# Message Attachment Download Token System

## Problem
When a message contains an attachment that exceeds the 1 MB limit, the attachment is stored on the server and a link is provided in the email. However, clicking on the link leads to a permission error because the link requires the user to be logged into the site via JWT authentication.

## Solution
Implemented a secure download token system that allows recipients to download large attachments from email links without requiring authentication.

## Implementation Details

### 1. Download Token Entity
**File:** `server/src/modules/messages/entities/download-token.entity.ts`

Created a new database entity to store temporary download tokens:
- `token`: 64-character secure random string (unique, indexed)
- `messageId`: Reference to the message
- `fileId`: Reference to the file in storage
- `teamId`: Reference to the team
- `expiresAt`: Expiration timestamp (indexed)
- `used`: Boolean flag to track one-time use
- `createdAt`: Creation timestamp

### 2. Download Token Service
**File:** `server/src/modules/messages/download-token.service.ts`

Created a service with the following methods:

#### `generateToken(messageId, fileId, teamId, expirationHours)`
- Generates a cryptographically secure random token
- Default expiration: 72 hours
- Stores token in database with associated metadata
- Returns token string

#### `validateToken(token)`
- Validates token exists and hasn't expired
- Checks if token has already been used
- Marks token as used (one-time use for security)
- Returns messageId, fileId, and teamId
- Throws NotFoundException if invalid/expired/used

#### `cleanupExpiredTokens()` (Cron Job)
- Runs daily at 2 AM
- Removes expired tokens from database
- Logs cleanup results

### 3. Public Download Controller
**File:** `server/src/modules/messages/messages.controller.ts`

Created new `PublicDownloadController` separate from the authenticated controller:

**Endpoint:** `GET /api/public/download/:token`
- No authentication required
- Validates token via DownloadTokenService
- Downloads file via MessagesService.downloadAttachmentByToken()
- Sets appropriate Content-Type and Content-Disposition headers
- Streams file to response

### 4. Messages Service Updates
**File:** `server/src/modules/messages/messages.service.ts`

#### Updated `sendEmailsToRecipients()` method:
- For large files (>1 MB):
  - Generates a download token (72-hour expiration)
  - Creates public download URL: `/api/public/download/{token}`
  - Includes URL in email body
- For small files (≤1 MB):
  - Continues to attach directly to email as base64

#### Added `downloadAttachmentByToken()` method:
- No user authentication check (token validation is done by controller)
- Verifies message exists and belongs to team
- Verifies file is attached to message
- Returns file data, filename, and mimeType

#### Updated email template:
- Added note about 72-hour expiration
- Added note about one-time use for security
- Improved messaging clarity

### 5. Database Migration
**File:** `server/src/migrations/1730500000000-AddDownloadTokens.ts`

Created migration to add `message_download_tokens` table with:
- All required columns
- Unique constraint on token
- Indexes on: token, expiresAt, messageId, fileId

### 6. Module Configuration
**File:** `server/src/modules/messages/messages.module.ts`

Updated to include:
- DownloadToken entity in TypeORM
- DownloadTokenService provider
- PublicDownloadController controller
- Exported DownloadTokenService

## Security Features

1. **Cryptographically Secure Tokens**: 64-character random tokens using Node.js crypto module
2. **Time-Limited Access**: Tokens expire after 72 hours
3. **One-Time Use**: Tokens are marked as used after first download
4. **Message Verification**: Ensures file belongs to the specified message
5. **Automatic Cleanup**: Daily cron job removes expired tokens

## User Experience Improvements

1. **No Login Required**: Recipients can download attachments directly from email
2. **Clear Instructions**: Email clearly states download links are provided for large files
3. **Security Notice**: Users are informed links expire in 72 hours and work once
4. **Seamless Process**: Click link → download starts immediately

## Testing Checklist

- [ ] Send a message with an attachment >1 MB
- [ ] Verify email contains download link instead of attachment
- [ ] Click download link from email (without being logged in)
- [ ] Verify file downloads successfully
- [ ] Try clicking same link again → should fail (one-time use)
- [ ] Wait 72+ hours → link should expire
- [ ] Verify daily cleanup cron job runs

## Environment Configuration

The download URLs use the `API_URL` from environment configuration:
```bash
API_URL=http://localhost:3000  # Development
API_URL=https://yourdomain.com # Production
```

## Database Schema

```sql
CREATE TABLE message_download_tokens (
  id UUID PRIMARY KEY,
  messageId UUID NOT NULL,
  fileId UUID NOT NULL,
  teamId UUID NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used BOOLEAN DEFAULT FALSE,
  INDEX idx_token (token),
  INDEX idx_expires (expiresAt),
  INDEX idx_message (messageId),
  INDEX idx_file (fileId)
);
```

## API Endpoints

### Public (No Authentication)
- `GET /api/public/download/:token` - Download attachment with token

### Authenticated (Requires JWT)
- `GET /api/teams/:teamId/messages/:messageId/attachments/:fileId/download` - Download attachment (for logged-in users viewing messages in app)

## Notes

- Tokens are single-use for security (prevents sharing)
- 72-hour expiration balances security and usability
- Daily cleanup keeps database size manageable
- Public endpoint is completely separate from authenticated routes
- Token validation happens before file access
