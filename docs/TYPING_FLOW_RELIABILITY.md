# Typing Flow & Reliability

## Job Status Transitions

### Valid Status Flow

```
pending → running → [paused | completed | failed | stopped | expired]
         ↓
      paused → running → [completed | failed | stopped | expired]
```

### Status Definitions

- **pending**: Job created but not yet started (transitions to `running` immediately)
- **running**: Actively typing batches into Google Docs
- **paused**: Temporarily stopped, can be resumed
- **completed**: Successfully finished typing all text
- **failed**: Error occurred (auth revoked, rate limit, etc.)
- **stopped**: Manually stopped by user (cannot be resumed)
- **expired**: Job exceeded 7-day TTL (auto-cleanup)

### Status Transition Logic

1. **Start Job** (`/api/jobs/start`):
   - Creates job with status `pending`
   - Immediately transitions to `running`
   - Triggers Inngest `job/start` event

2. **Pause Job** (`/api/jobs/pause`):
   - Only valid if status is `running`
   - Transitions to `paused`
   - Inngest function continues but won't process batches

3. **Resume Job** (`/api/jobs/resume`):
   - Only valid if status is `paused`
   - Transitions to `running`
   - Triggers Inngest `job/batch` event to continue

4. **Stop Job** (`/api/jobs/stop`):
   - Valid for `running` or `paused`
   - Transitions to `stopped`
   - Unlocks document for reuse
   - Cannot be resumed

5. **Complete Job** (Inngest function):
   - Automatically transitions to `completed` when all text typed
   - Unlocks document
   - Sets `completedAt` timestamp

6. **Fail Job** (Inngest function):
   - Transitions to `failed` on errors:
     - `GOOGLE_AUTH_REVOKED`: User revoked Google access
     - `RATE_LIMIT`: Google API rate limit exceeded
     - `MAX_RUNTIME_EXCEEDED`: Job ran >8 hours
   - Unlocks document

7. **Expire Job** (Cleanup function):
   - Transitions to `expired` after 7 days
   - Unlocks document

## Progress Streaming (SSE)

### Implementation

- **Endpoint**: `/api/progress/stream?jobId={id}`
- **Protocol**: Server-Sent Events (SSE)
- **Polling**: 1 second intervals
- **Data**: Job metadata only (excludes `textContent` for privacy)

### Reconnection Logic

- **Automatic Reconnect**: On connection error, attempts reconnect
- **Exponential Backoff**: 2s, 4s, 6s, 8s, 10s delays (max 10s)
- **Max Attempts**: 10 reconnection attempts
- **User Notification**: Warns user after max attempts reached

### Stream Closure

Stream automatically closes when:
- Job status is `completed`, `stopped`, `failed`, or `expired`
- Job not found (deleted)
- User navigates away (cleanup on unmount)

### Memory Leak Prevention

- Stream reference stored in `progressStreamRef`
- Cleanup on component unmount
- Only one stream active at a time
- Old streams closed before creating new ones

## Inngest Functions

### Registered Functions

1. **typingJob** (`job/start` event):
   - Initial job processing
   - Loads job, validates status
   - Processes first batch
   - Schedules subsequent batches

2. **typingBatch** (`job/batch` event):
   - Continues job processing
   - Processes batches sequentially
   - Handles rate limiting and errors
   - Schedules next batch or completes

3. **cleanupJobs** (Cron: daily at 2 AM UTC):
   - Marks stale jobs as failed (>8 hours)
   - Marks expired jobs (>7 days)
   - Scrubs text content (>30 days)
   - Deletes old jobs (>90 days)

### Function Configuration

- **Client ID**: `assistive-typing-app`
- **Endpoint**: `/api/inngest` (auto-discovered by Inngest Cloud)
- **Environment**: Configured via `INNGEST_BASE_URL`:
  - Development: `http://localhost:3000/api/inngest`
  - Production: Auto-discovered by Inngest Cloud

### Error Handling

#### Inngest Down

- Job creation succeeds even if Inngest dispatch fails
- Job status remains `running` (can be manually stopped)
- Event logged in `JobEvent` table with type `start_dispatch_failed`
- UI can retry or user can manually stop job

#### Job Crashes Mid-Way

- Inngest retries failed steps automatically
- `ensureRunnable()` validates job status before each batch
- Stuck jobs (>1 hour) cleaned up on next start attempt
- Max runtime check (8 hours) prevents infinite jobs

#### Google API Errors

- **Auth Revoked**: Job marked as `failed` with `GOOGLE_AUTH_REVOKED`
- **Rate Limit**: Adaptive throttling increases delay
- **Other Errors**: Logged, job continues with retry delay

## Edge Cases

### Empty/Whitespace Text

- Validated: `textContent` must be non-empty (min 1 char)
- Max length: 50,000 characters
- Whitespace-only text is valid (will type spaces)

### Concurrent Jobs

- Only one job per document at a time
- Document locked with `currentJobId` reference
- Atomic transaction prevents race conditions
- User can only have one running job at a time

### Document Selection

- Document must be explicitly selected or created
- Document ID validated and required
- Ownership verified (user must own document)

### Job Expiration

- Jobs expire after 7 days (`expiresAt` field)
- Expired jobs cannot be resumed
- Cleanup job marks expired jobs daily
- Expired jobs unlock documents automatically

## Testing Checklist

### Start Flow
- [ ] Short text (< 100 chars)
- [ ] Long text (50,000 chars)
- [ ] Empty text (should fail validation)
- [ ] Whitespace-only text
- [ ] Special characters (unicode, emojis)

### Pause/Resume Flow
- [ ] Pause running job
- [ ] Resume paused job
- [ ] Pause already paused job (should fail)
- [ ] Resume non-paused job (should fail)

### Stop Flow
- [ ] Stop running job
- [ ] Stop paused job
- [ ] Stop already stopped job (should fail)
- [ ] Stop completed job (should fail)

### Progress Stream
- [ ] Stream connects successfully
- [ ] Updates received every second
- [ ] Reconnects on network error
- [ ] Closes on job completion
- [ ] Handles job not found gracefully
- [ ] No memory leaks on page navigation

### Error Scenarios
- [ ] Inngest down during job start
- [ ] Google auth revoked mid-job
- [ ] Rate limit exceeded
- [ ] Job exceeds max runtime
- [ ] Network error during stream

## Performance Considerations

- **Batch Size**: Adaptive based on typing profile
- **Throttling**: Adaptive delay increases on rate limits
- **Polling**: 1-second intervals (balance between responsiveness and load)
- **Database Queries**: Optimized with indexes on `userId`, `status`, `createdAt`
- **Stream Cleanup**: Automatic cleanup prevents memory leaks

## Monitoring

### Key Metrics to Track

- Job completion rate
- Average job duration
- Error rates by type (`GOOGLE_AUTH_REVOKED`, `RATE_LIMIT`, etc.)
- Stream reconnection frequency
- Inngest function execution times
- Cleanup job execution results

### Logging

- Job lifecycle events logged in `JobEvent` table
- Error details logged with context
- Inngest dispatch failures logged (non-blocking)
- Stream errors logged with reconnect attempts







