# File Storage System Design

## Overview

The File Storage System is a centralized service that manages file uploads, storage, retrieval, and deletion across multiple subsystems in the application. It provides a unified approach to handling files with database tracking, physical file storage, and secure access control.

**Last Updated:** October 31, 2025  
**Version:** 1.0

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
├─────────────────┬──────────────────┬────────────────────────┤
│  Team Media     │    Messages      │   Future Subsystems    │
│   Subsystem     │   Subsystem      │                        │
└────────┬────────┴────────┬─────────┴────────────┬───────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           ▼
         ┌─────────────────────────────────────┐
         │     FileStorageService (Core)       │
         ├─────────────────────────────────────┤
         │  • storeFile()                      │
         │  • getFile()                        │
         │  • deleteFile()                     │
         │  • getFilesByUser()                 │
         │  • getFilesBySubsystem()            │
         │  • getFileMetadata()                │
         └──────────┬──────────────────┬───────┘
                    │                  │
         ┌──────────▼──────┐  ┌────────▼────────┐
         │   Database      │  │  File System    │
         │   (MySQL)       │  │  Storage        │
         │                 │  │                 │
         │ stored_files    │  │ Physical Files  │
         │   table         │  │ (configured     │
         │                 │  │  directory)     │
         └─────────────────┘  └─────────────────┘
```

---

## Core Service: FileStorageService

### Location
`server/src/modules/file-storage/file-storage.service.ts`

### Configuration

The service requires an environment variable to specify the storage location:

```bash
FILE_STORAGE_PATH=/absolute/path/to/storage
```

**Requirements:**
- Must be an absolute path
- Directory is automatically created if it doesn't exist
- Application must have read/write permissions

### Database Entity: StoredFile

**Location:** `server/src/modules/file-storage/entities/stored-file.entity.ts`

**Schema:**

```typescript
@Entity('stored_files')
export class StoredFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;                      // Unique file identifier

  @Column({ type: 'varchar', length: 255 })
  originalFilename: string;         // User's original filename

  @Column({ type: 'varchar', length: 255 })
  storedFilename: string;           // UUID-based filename on disk

  @Column({ type: 'varchar', length: 100 })
  subsystem: string;                // Which subsystem owns this file

  @Column({ type: 'uuid' })
  userId: string;                   // User who uploaded the file

  @Column({ type: 'bigint' })
  fileSize: number;                 // Size in bytes

  @Column({ type: 'varchar', length: 255, nullable: true })
  mimeType: string;                 // Content type

  @CreateDateColumn()
  createdAt: Date;                  // Upload timestamp

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
```

**Relationships:**
- Cascading delete: When a user is deleted, their files are automatically removed

---

## Core Operations

### 1. File Upload (`storeFile`)

**Purpose:** Store a file in the file system and create a database record.

**Signature:**
```typescript
async storeFile(
  fileBuffer: Buffer,
  originalFilename: string,
  userId: string,
  subsystem: string,
  mimeType?: string
): Promise<StoredFile>
```

**Process:**
1. Generate unique filename using UUID + original file extension
2. Write file to physical storage directory
3. Create database record with metadata
4. Return `StoredFile` entity with all metadata

**File Naming:**
- Format: `{uuid}.{extension}`
- Example: `a3f2e1d4-5b6c-7d8e-9f0a-1b2c3d4e5f6g.pdf`
- Prevents filename collisions
- Preserves file extension for type identification

**Subsystem Identification:**
Current subsystems:
- `messages` - Message attachments
- `team-media` - Team media files

### 2. File Retrieval (`getFile`)

**Purpose:** Retrieve file content and metadata.

**Signature:**
```typescript
async getFile(fileId: string): Promise<{ file: StoredFile; data: Buffer }>
```

**Returns:**
- `file`: Database entity with all metadata
- `data`: File content as Buffer

**Error Handling:**
- `NotFoundException` if file record doesn't exist in database
- `NotFoundException` if file doesn't exist on disk

### 3. File Deletion (`deleteFile`)

**Purpose:** Remove file from both database and file system.

**Signature:**
```typescript
async deleteFile(fileId: string): Promise<void>
```

**Process:**
1. Lookup file record in database
2. Delete physical file from disk (with error handling)
3. Remove database record

**Safety Features:**
- Continues with database deletion even if physical file deletion fails
- Logs warnings for disk deletion failures

### 4. Query Operations

#### Get Files by User
```typescript
async getFilesByUser(userId: string, subsystem?: string): Promise<StoredFile[]>
```
- List all files uploaded by a specific user
- Optional subsystem filter

#### Get Files by Subsystem
```typescript
async getFilesBySubsystem(subsystem: string): Promise<StoredFile[]>
```
- List all files belonging to a subsystem
- Useful for subsystem-specific management

#### Get File Metadata Only
```typescript
async getFileMetadata(fileId: string): Promise<StoredFile>
```
- Retrieve database record without reading file content
- Efficient for displaying file lists

---

## MIME Type Detection

The service includes automatic MIME type detection based on file extensions:

**Supported Types:**

| Extension | MIME Type |
|-----------|-----------|
| .pdf | application/pdf |
| .doc | application/msword |
| .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| .xls | application/vnd.ms-excel |
| .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| .ppt | application/vnd.ms-powerpoint |
| .pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation |
| .txt | text/plain |
| .jpg, .jpeg | image/jpeg |
| .png | image/png |
| .gif | image/gif |
| .zip | application/zip |
| .csv | text/csv |
| *default* | application/octet-stream |

**Override:** MIME type can be explicitly provided during upload (recommended for uploaded files with known content-type headers).

---

## Integration Examples

### 1. Team Media Subsystem

**Purpose:** Store team-shared media files (images, videos, documents)

**Integration Point:** `server/src/modules/team-media/team-media.service.ts`

**Upload Flow:**
```typescript
async uploadFile(
  teamId: string,
  userId: string,
  file: any,
  createDto: CreateTeamMediaDto
): Promise<TeamMediaResponseDto> {
  // 1. Verify team membership
  await this.verifyTeamMembership(userId, teamId);

  // 2. Store file using FileStorageService
  const storedFile = await this.fileStorageService.storeFile(
    file.buffer,
    file.originalname,
    userId,
    'team-media',    // Subsystem identifier
    file.mimetype
  );

  // 3. Create team media record linking to stored file
  const teamMedia = this.teamMediaRepository.create({
    teamId,
    userId,
    fileId: storedFile.id,  // Reference to stored file
    title: createDto.title
  });

  return await this.teamMediaRepository.save(teamMedia);
}
```

**Download Flow:**
```typescript
async downloadFile(id: string): Promise<{ data: Buffer; filename: string; mimeType: string }> {
  const media = await this.findOne(id);
  
  // Retrieve file from storage
  const { file, data } = await this.fileStorageService.getFile(media.fileId);
  
  return {
    data,
    filename: file.originalFilename,
    mimeType: file.mimeType
  };
}
```

**Features:**
- Preview generation for images and videos
- Thumbnail caching for videos
- Real-time upload progress tracking
- Drag-and-drop file upload
- File filtering by title, filename, or uploader

**API Endpoints:**
- `POST /api/teams/:teamId/media` - Upload file
- `GET /api/teams/:teamId/media` - List team files
- `GET /api/teams/:teamId/media/:id/download` - Download full file
- `GET /api/teams/:teamId/media/:id/preview` - Preview/thumbnail
- `PATCH /api/teams/:teamId/media/:id` - Update title
- `DELETE /api/teams/:teamId/media/:id` - Delete file

### 2. Messages Subsystem

**Purpose:** Handle message attachments with intelligent size-based delivery

**Integration Point:** `server/src/modules/messages/messages.service.ts`

**Smart Attachment Handling:**

The messages subsystem implements a two-tier attachment strategy:

**Small Files (≤1 MB):**
- Attached directly to email
- Base64 encoded in email body
- Immediate access for recipients

**Large Files (>1 MB):**
- Stored in file storage
- Download link provided in email
- Prevents email size issues
- Better performance

**Upload Flow:**
```typescript
async sendMessage(
  senderId: string,
  sendMessageDto: SendMessageDto,
  files?: any[]
): Promise<MessageResponseDto> {
  const attachmentFileIds: string[] = [];
  
  if (files && files.length > 0) {
    for (const file of files) {
      // Store each attachment
      const storedFile = await this.fileStorageService.storeFile(
        file.buffer,
        file.originalname,
        senderId,
        'messages',      // Subsystem identifier
        file.mimetype
      );
      attachmentFileIds.push(storedFile.id);
    }
  }

  // Create message with attachment references
  const message = this.messageRepository.create({
    ...sendMessageDto,
    senderId,
    attachmentFileIds: attachmentFileIds.length > 0 ? attachmentFileIds : undefined
  });

  await this.messageRepository.save(message);
  
  // Send emails asynchronously with intelligent attachment handling
  this.sendEmailsToRecipients(message, sender, team, recipients, attachmentFileIds);
}
```

**Email Generation with Size-Based Logic:**
```typescript
private async sendEmailsToRecipients(
  message: TeamMessage,
  sender: User,
  team: Team,
  recipients: User[],
  attachmentFileIds?: string[]
): Promise<void> {
  const MAX_ATTACHMENT_SIZE = 1 * 1024 * 1024; // 1 MB threshold
  
  const emailAttachments: any[] = [];
  const largeAttachments: Array<{ filename: string; downloadUrl: string }> = [];

  if (attachmentFileIds && attachmentFileIds.length > 0) {
    for (const fileId of attachmentFileIds) {
      const { file, data } = await this.fileStorageService.getFile(fileId);
      
      if (file.fileSize > MAX_ATTACHMENT_SIZE) {
        // Large file - generate download link
        const downloadUrl = `${apiUrl}/api/teams/${message.teamId}/messages/${message.id}/attachments/${fileId}/download`;
        largeAttachments.push({
          filename: file.originalFilename,
          downloadUrl
        });
      } else {
        // Small file - attach to email
        emailAttachments.push({
          filename: file.originalFilename,
          content: data.toString('base64'),
          contentType: file.mimeType || 'application/octet-stream'
        });
      }
    }
  }

  // Generate email with download links for large files
  const emailContent = this.generateEmailContent(message, sender, team, largeAttachments);
  
  // Send email with small files attached, large files as links
  await this.emailService.queueEmail({
    to: recipients.map(r => r.primaryEmail),
    subject: `Team Message: ${message.subject}`,
    html: emailContent,
    attachments: emailAttachments
  });
}
```

**Download Endpoint:**
```typescript
async downloadAttachment(
  userId: string,
  teamId: string,
  messageId: string,
  fileId: string
): Promise<{ data: Buffer; filename: string; mimeType: string }> {
  // 1. Verify user is team member
  // 2. Verify message exists and belongs to team
  // 3. Verify file is attached to this message
  
  // 4. Retrieve from storage
  const { file, data } = await this.fileStorageService.getFile(fileId);
  
  return {
    data,
    filename: file.originalFilename,
    mimeType: file.mimeType
  };
}
```

**Upload Limits:**

Configured via Multer:
```typescript
MulterModule.register({
  limits: {
    fileSize: 50 * 1024 * 1024,  // 50MB per file
    files: 10                     // Max 10 files per message
  }
})
```

**Features:**
- Total attachment size validation (50MB limit)
- Automatic separation of small/large files
- Secure download links with authentication
- Team membership verification
- Message attachment verification

**API Endpoints:**
- `POST /api/teams/:teamId/messages` - Send message with attachments
- `GET /api/teams/:teamId/messages` - List messages
- `GET /api/teams/:teamId/messages/:messageId/attachments/:fileId/download` - Download attachment

---

## Security Considerations

### Access Control

**File Storage Service:**
- Does NOT implement access control
- Responsibility of calling subsystems

**Subsystem Implementations Must:**
1. **Verify User Identity:** Use JWT authentication guards
2. **Verify Permissions:** Check team membership, roles, or ownership
3. **Verify Resource Association:** Ensure file belongs to requested resource

**Example Security Pattern (Team Media):**
```typescript
async downloadFile(id: string, userId: string): Promise<any> {
  // 1. Find media record
  const media = await this.findOne(id);
  
  // 2. Verify user is team member
  const userTeam = await this.userTeamRepository.findOne({
    where: { userId, teamId: media.teamId }
  });
  
  if (!userTeam) {
    throw new ForbiddenException('Not a team member');
  }
  
  // 3. Access granted - retrieve file
  return await this.fileStorageService.getFile(media.fileId);
}
```

**Example Security Pattern (Messages):**
```typescript
async downloadAttachment(userId: string, teamId: string, messageId: string, fileId: string) {
  // 1. Verify team membership
  const userTeam = await this.userTeamRepository.findOne({
    where: { userId, teamId, status: MembershipStatus.ACTIVE }
  });
  if (!userTeam) throw new ForbiddenException('Not a team member');
  
  // 2. Verify message exists and belongs to team
  const message = await this.messageRepository.findOne({
    where: { id: messageId, teamId }
  });
  if (!message) throw new NotFoundException('Message not found');
  
  // 3. Verify file is attached to this message
  if (!message.attachmentFileIds?.includes(fileId)) {
    throw new ForbiddenException('File not attached to this message');
  }
  
  // 4. Access granted - retrieve file
  return await this.fileStorageService.getFile(fileId);
}
```

### File System Security

**Stored Filenames:**
- UUIDs prevent path traversal attacks
- Original filenames never used for storage
- Extensions preserved for type identification only

**Storage Directory:**
- Should be outside web server document root
- Access only via application APIs
- No direct URL access to files

---

## Performance Considerations

### Database Queries

**Indexed Fields:**
- `userId` - Fast user file lookups
- `subsystem` - Fast subsystem queries
- `id` (PK) - UUID primary key with index

**Query Optimization:**
- Use metadata queries when file content not needed
- Implement pagination for large file lists
- Consider caching for frequently accessed files

### File System

**Storage Best Practices:**
- Use fast storage (SSD preferred) for frequently accessed files
- Consider separate storage for large media files
- Implement cleanup for orphaned files

**Caching Strategy (Frontend):**
- Blob URLs cached for session duration
- Thumbnails cached in localStorage
- Video thumbnails generated on-demand and cached

---

## Error Handling

### Service-Level Errors

```typescript
// File not found in database
throw new NotFoundException(`File with ID ${fileId} not found`);

// File missing from disk
throw new NotFoundException(`File ${storedFilename} not found on disk`);

// Configuration error
throw new Error('FILE_STORAGE_PATH environment variable is not set');
throw new Error('FILE_STORAGE_PATH must be an absolute path');
```

### Subsystem-Level Errors

```typescript
// Permission denied
throw new ForbiddenException('User is not a member of this team');

// Invalid file
throw new BadRequestException('File size exceeds maximum allowed');
throw new BadRequestException('Invalid file type');

// Resource not found
throw new NotFoundException('Message not found');
```

---

## Frontend Integration

### Upload with Progress Tracking

```typescript
uploadFile(teamId: string, file: File, title: string): Observable<HttpEvent<TeamMedia>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);

  return this.http.post<TeamMedia>(
    `${this.apiUrl}/${teamId}/media`,
    formData,
    {
      reportProgress: true,   // Enable progress events
      observe: 'events'       // Receive all HTTP events
    }
  );
}
```

**Progress Event Handling:**
```typescript
this.teamMediaService.uploadFile(teamId, file, title).subscribe({
  next: (event) => {
    if (event.type === HttpEventType.UploadProgress) {
      // Calculate and display progress percentage
      const percentDone = Math.round(100 * event.loaded / (event.total || 1));
      this.uploadProgress.set(percentDone);
    } else if (event.type === HttpEventType.Response) {
      // Upload complete
      this.isUploading.set(false);
      this.loadMedia();
    }
  },
  error: (error) => {
    this.isUploading.set(false);
    alert('Upload failed: ' + error.message);
  }
});
```

### Download Files

```typescript
async downloadMedia(media: TeamMedia): Promise<void> {
  const url = this.teamMediaService.getDownloadUrl(this.teamId(), media.id);
  const blob = await this.http.get(url, { responseType: 'blob' }).toPromise();
  
  if (blob) {
    // Create blob URL for download
    const blobUrl = URL.createObjectURL(blob);
    
    // Trigger browser download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = media.originalFilename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }
}
```

### Drag-and-Drop Support

```typescript
onDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0];
    this.selectedFile.set(file);
    
    // Auto-populate title from filename
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    this.uploadTitle.set(nameWithoutExt);
  }
}
```

---

## Future Enhancements

### Planned Features

1. **File Versioning**
   - Track multiple versions of the same file
   - Maintain version history
   - Rollback capability

2. **Storage Backends**
   - Cloud storage integration (S3, Azure Blob, Google Cloud Storage)
   - Configurable storage providers
   - Automatic cloud backup

3. **Image Processing**
   - Automatic thumbnail generation
   - Image resizing and optimization
   - Format conversion

4. **Virus Scanning**
   - Integration with antivirus APIs
   - Pre-upload scanning
   - Quarantine for suspicious files

5. **Content Delivery**
   - CDN integration for public files
   - Signed URLs with expiration
   - Bandwidth optimization

6. **Storage Management**
   - Storage quota per user/team
   - Automatic cleanup of old files
   - Archive inactive files
   - Storage usage reports

7. **Advanced Search**
   - Full-text search in document content
   - Metadata-based filtering
   - Tag system for organization

8. **Folder Hierarchy**
   - Nested folder support
   - Folder-level permissions
   - Drag-and-drop organization

---

## Database Schema

### stored_files Table

```sql
CREATE TABLE `stored_files` (
  `id` varchar(36) PRIMARY KEY,
  `originalFilename` varchar(255) NOT NULL,
  `storedFilename` varchar(255) NOT NULL,
  `subsystem` varchar(100) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `fileSize` bigint NOT NULL,
  `mimeType` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  
  KEY `idx_stored_files_userId` (`userId`),
  KEY `idx_stored_files_subsystem` (`subsystem`),
  
  CONSTRAINT `fk_stored_files_user` 
    FOREIGN KEY (`userId`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE
);
```

### Integration Tables

**team_media:**
```sql
CREATE TABLE `team_media` (
  `id` varchar(36) PRIMARY KEY,
  `teamId` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `fileId` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  
  KEY `idx_team_media_teamId` (`teamId`),
  
  CONSTRAINT `fk_team_media_team` 
    FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_media_user` 
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_media_file` 
    FOREIGN KEY (`fileId`) REFERENCES `stored_files` (`id`) ON DELETE CASCADE
);
```

**team_messages (attachments stored in JSON array):**
```sql
CREATE TABLE `team_messages` (
  ...
  `attachmentFileIds` json DEFAULT NULL,
  ...
);
```

---

## Configuration Summary

### Environment Variables

```bash
# Required
FILE_STORAGE_PATH=/absolute/path/to/storage

# Recommended for Messages subsystem
EMAIL_API_URL=https://your-domain.com  # For download link generation
```

### Module Configuration

**File Storage Module:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([StoredFile])],
  providers: [FileStorageService],
  exports: [FileStorageService]
})
export class FileStorageModule {}
```

**Messages Module (with upload limits):**
```typescript
@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024,  // 50MB per file
        files: 10                     // Max 10 files
      }
    }),
    FileStorageModule
  ]
})
export class MessagesModule {}
```

---

## Troubleshooting

### Common Issues

**Issue:** Files not uploading
- Check FILE_STORAGE_PATH is set and valid
- Verify directory permissions (read/write)
- Check disk space availability
- Verify Multer file size limits

**Issue:** Files not downloading
- Verify user has proper permissions
- Check file exists in database
- Verify physical file exists on disk
- Check authentication token is valid

**Issue:** Large attachments fail
- Verify Multer limits are configured
- Check total attachment size < 50MB
- Verify network timeout settings

**Issue:** Orphaned files (in DB but not on disk, or vice versa)
- Implement cleanup scripts
- Check error logs during upload/delete
- Verify cascade delete relationships

---

## Monitoring and Maintenance

### Key Metrics to Track

1. **Storage Usage**
   - Total disk space used
   - Per-user storage usage
   - Per-team storage usage
   - Growth rate

2. **Performance**
   - Upload speed
   - Download speed
   - Time to retrieve file metadata
   - Database query performance

3. **Errors**
   - Failed uploads
   - File not found errors
   - Permission denied errors
   - Disk space errors

### Maintenance Tasks

**Regular:**
- Monitor disk space
- Check for orphaned files
- Review error logs
- Performance analysis

**Periodic:**
- Database index optimization
- Storage cleanup
- Archive old files
- Backup file storage directory

---

## API Reference Summary

### FileStorageService Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `storeFile()` | Upload and store file | `StoredFile` entity |
| `getFile()` | Retrieve file content | `{ file, data }` |
| `deleteFile()` | Remove file | `void` |
| `getFilesByUser()` | List user's files | `StoredFile[]` |
| `getFilesBySubsystem()` | List subsystem files | `StoredFile[]` |
| `getFileMetadata()` | Get file info only | `StoredFile` |

### Team Media Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/teams/:teamId/media` | Upload file |
| GET | `/api/teams/:teamId/media` | List files |
| GET | `/api/teams/:teamId/media/:id/download` | Download file |
| GET | `/api/teams/:teamId/media/:id/preview` | Preview/thumbnail |
| PATCH | `/api/teams/:teamId/media/:id` | Update title |
| DELETE | `/api/teams/:teamId/media/:id` | Delete file |

### Messages Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/teams/:teamId/messages` | Send with attachments |
| GET | `/api/teams/:teamId/messages` | List messages |
| GET | `/api/teams/:teamId/messages/:messageId/attachments/:fileId/download` | Download attachment |

---

## Conclusion

The File Storage System provides a robust, scalable foundation for file management across the application. Its centralized design ensures consistency, security, and maintainability while allowing flexibility for different subsystem requirements.

Key strengths:
- **Unified Storage:** Single service for all file operations
- **Metadata Tracking:** Complete file information in database
- **Security:** Subsystem-enforced access control
- **Flexibility:** Adaptable to different use cases
- **Performance:** Efficient queries and caching strategies
- **User Experience:** Progress tracking, drag-and-drop, previews

The system is production-ready and designed to support future enhancements while maintaining backward compatibility.
