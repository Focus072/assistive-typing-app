# Privacy & Data Handling

## What We Store

### Stored in Database

1. **User Account Data** (`User` table):
   - Email address
   - Name (optional)
   - Profile image URL (optional)
   - Account creation timestamp

2. **Google OAuth Tokens** (`GoogleToken` table):
   - Access token (encrypted)
   - Refresh token (encrypted)
   - Token expiration timestamp
   - **Purpose**: Required to type into Google Docs on your behalf

3. **Job Metadata** (`Job` table):
   - Job ID (internal identifier)
   - User ID (who created the job)
   - Document ID (Google Docs document ID)
   - **Text content** (the text to be typed) - **Temporarily stored**
   - Job status, progress, timing, typing profile
   - Creation and completion timestamps
   - **Note**: Text content is scrubbed after 30 days, jobs deleted after 90 days

4. **Job Events** (`JobEvent` table):
   - Job lifecycle events (started, paused, resumed, stopped, failed)
   - Event timestamps
   - Event details (JSON metadata)
   - **Note**: Automatically deleted when job is deleted (cascade)

5. **Document State** (`Document` table):
   - Document ID (Google Docs document ID)
   - User ID (who owns the document)
   - Current job state (idle/running)
   - **Purpose**: Prevents concurrent typing jobs on same document

### NOT Stored

1. **Google Docs Content**: We never read or store the actual content of your Google Docs after typing completes. We only store the text you provide to be typed.

2. **Document Content**: The content that exists in your Google Docs before or after typing is never accessed or stored.

3. **Sensitive User Data**: We don't store passwords (Google OAuth only), payment information, or other sensitive personal data.

## Data Retention & Cleanup

### Automatic Cleanup (via Inngest)

The cleanup job runs daily at 2 AM UTC:

1. **Stale Jobs** (>8 hours running):
   - Marked as "failed" with error code `MAX_RUNTIME_EXCEEDED`
   - Document unlocked for reuse

2. **Expired Jobs** (>7 days old):
   - Marked as "expired"
   - Document unlocked for reuse

3. **Text Content Scrubbing** (>30 days old):
   - `textContent` field cleared (set to empty string)
   - Job metadata retained for analytics

4. **Job Deletion** (>90 days old):
   - Jobs and associated events permanently deleted
   - Cascade deletion ensures no orphaned data

### Manual Cleanup

Users can:
- Stop jobs manually (immediately unlocks document)
- Delete account (cascades to all user data)

## Document Access Control

### Explicit User Selection Required

- Documents are **only** typed into when:
  1. User explicitly selects a document from their Google Docs list, OR
  2. User creates a new document through the app

- Documents are **never** typed into:
  - Without explicit user selection
  - Automatically or in the background
  - Without user consent

### Ownership Verification

All API endpoints verify:
- User owns the job (`job.userId === session.user.id`)
- User owns the document (`document.userId === session.user.id`)
- Document is in correct state before operations

## API Input Validation

### All Endpoints Validate:

1. **Authentication**: Session required, user ID verified
2. **Input Schema**: Zod schemas validate all inputs
3. **Ownership**: Users can only access their own data
4. **Rate Limiting**: Daily job limit (50 jobs/day per user)

### Validated Endpoints

- `/api/jobs/start`: Validates textContent, durationMinutes, typingProfile, documentId
- `/api/jobs/pause`: Validates jobId, verifies ownership
- `/api/jobs/resume`: Validates jobId, verifies ownership
- `/api/jobs/stop`: Validates jobId, verifies ownership
- `/api/google-docs/create`: Validates title, format metadata
- `/api/google-docs/list`: Returns only user's documents

## Rate Limiting

### Current Limits

- **Daily Job Limit**: 50 jobs per user per day
- **Text Length**: Maximum 50,000 characters per job
- **Duration**: 10 minutes to 6 hours per job

### Future Enhancements

- Per-endpoint rate limiting (e.g., 10 requests/minute)
- IP-based throttling for abuse prevention
- Adaptive rate limiting based on system load

## Sensitive Data Protection

### Exposed in API Responses

- **Job List** (`/api/jobs`): Excludes `textContent` field
- **Job Details**: Only exposed to job owner
- **Error Messages**: Generic errors in production, detailed in development

### Not Exposed

- Internal database IDs (only CUIDs exposed)
- Google OAuth tokens (never exposed)
- User passwords (not applicable - OAuth only)
- Stack traces (only in development mode)

### Logging

- Production logs exclude sensitive content
- Text content length logged, not content itself
- Error details only logged in development

## Google OAuth Scopes

We request minimal scopes:

- `openid`, `email`, `profile`: Basic user info
- `https://www.googleapis.com/auth/drive.file`: Access only to files created by app

**Note**: `drive.file` is the most restrictive scope - we can only access files we create, not all your Google Drive files.

## User Rights

### Data Access

- Users can view all their jobs via `/api/jobs`
- Users can view their document list via `/api/google-docs/list`

### Data Deletion

- Users can stop/delete individual jobs
- Account deletion cascades to all user data (jobs, documents, tokens)

### Google Access Revocation

- Users can revoke Google access in Google Account settings
- App will prompt to re-authenticate when access is revoked

## Compliance Notes

- **GDPR**: Users can request data deletion
- **CCPA**: Users can request data access/deletion
- **Data Minimization**: Only store what's necessary for functionality
- **Purpose Limitation**: Data used only for typing functionality
- **Retention**: Automatic cleanup after defined periods

## Security Measures

1. **Authentication**: NextAuth.js handles secure session management
2. **Authorization**: All endpoints verify user ownership
3. **Input Validation**: Zod schemas prevent injection attacks
4. **SQL Injection**: Prisma ORM prevents SQL injection
5. **XSS Protection**: React escapes content by default
6. **CSRF Protection**: NextAuth.js includes CSRF protection

## Questions or Concerns

If you have questions about data handling or privacy:
- Review this document
- Check the Privacy Policy (`/privacy`)
- Contact support for data deletion requests







