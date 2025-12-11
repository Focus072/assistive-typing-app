# Assistive Typing Application

An assistive typing application that automatically types text into Google Docs with human-like rhythm. Designed to help people who cannot physically type or who fatigue quickly.

## Features

- ✅ Email authentication with NextAuth.js
- ✅ Google OAuth integration for Google Docs API
- ✅ Automatic typing with configurable duration (10 minutes to 6 hours)
- ✅ Human-like typing patterns with variable speed, pauses, and corrections
- ✅ Multiple typing profiles (Steady, Fatigue, Burst, Micro-pause)
- ✅ Real-time progress tracking
- ✅ Pause, resume, and stop controls
- ✅ Job history and resume capability
- ✅ Background job processing with Inngest
- ✅ Persistent state with automatic resume on restart
- ✅ Rate limiting and abuse prevention
- ✅ Accessibility features (keyboard navigation, screen reader support)

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + Shadcn UI
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **Background Jobs**: Inngest
- **Google APIs**: Google Docs API

## Setup

### Quick Start

For a quick setup guide, see [QUICKSTART.md](./QUICKSTART.md)

For detailed setup instructions, see [SETUP.md](./SETUP.md)

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud)
- Google Cloud Project with Docs API enabled
- Inngest account (or use local dev server)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create `.env.local` file (see `.env.example` for template):

```bash
# Quick setup - copy template
cp .env.example .env.local  # Mac/Linux
# or
Copy-Item .env.example .env.local  # Windows PowerShell
```

Then edit `.env.local` and fill in your values. See [SETUP.md](./SETUP.md) for detailed instructions.

3. Verify setup:

```bash
npm run setup:check
```

4. Set up the database:

```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:

```bash
npm run dev
```

Visit http://localhost:3000

### Setup Checklist

- [ ] Install dependencies: `npm install`
- [ ] Create `.env.local` file
- [ ] Set up PostgreSQL database
- [ ] Configure Google Cloud OAuth
- [ ] Set up Inngest (cloud or local dev server)
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma db push`
- [ ] Start dev server: `npm run dev`

## Usage

1. **Register/Login**: Create an account or sign in with email
2. **Connect Google**: Sign in with Google to grant Docs API access
3. **Paste Text**: Enter or paste the text you want to type
4. **Select Duration**: Choose how long the typing should take (10 min - 6 hours)
5. **Choose Profile**: Select a typing pattern (Steady, Fatigue, Burst, or Micro-pause)
6. **Select Document**: Choose an existing Google Doc or create a new one
7. **Start**: Click Start to begin typing
8. **Monitor**: Watch real-time progress and use pause/resume/stop controls

## Architecture

### Background Jobs

Jobs run in Inngest functions that can handle long-running tasks (up to 6 hours). Each job:
- Processes text in batches (20 characters per batch)
- Maintains persistent state in the database
- Can be paused, resumed, or stopped
- Automatically resumes after crashes/restarts

### Idempotency

The system ensures no double-inserts or skipped text:
- Batches are computed from current database state
- `currentIndex` is only updated after successful API calls
- Batch hashing prevents duplicate inserts
- Retries recompute batches from current state

### Rate Limiting

- Adaptive throttling with exponential backoff
- Minimum 500ms between API calls
- Automatic detection and handling of 429 errors
- Per-user limits: 5 jobs/day, 50,000 chars/job, 1 concurrent job

### Job Lifecycle

- **Pending**: Job created, waiting to start
- **Running**: Actively typing
- **Paused**: Temporarily stopped, can be resumed
- **Stopped**: Permanently stopped, cannot resume
- **Completed**: Finished successfully
- **Failed**: Error occurred
- **Expired**: TTL exceeded (7 days)

## API Routes

- `/api/auth/*` - Authentication endpoints
- `/api/google-docs/list` - List user's Google Docs
- `/api/google-docs/create` - Create new Google Doc
- `/api/jobs/start` - Start a new typing job
- `/api/jobs/pause` - Pause a running job
- `/api/jobs/resume` - Resume a paused job
- `/api/jobs/stop` - Stop a job permanently
- `/api/jobs` - List user's jobs
- `/api/jobs/[id]` - Get job details
- `/api/progress/stream` - SSE stream for real-time progress
- `/api/inngest` - Inngest webhook endpoint

## Database Schema

- **User**: User accounts with email/password
- **GoogleToken**: OAuth tokens for Google Docs API
- **Job**: Typing jobs with state and progress
- **JobEvent**: Audit trail of job events

## Safety Features

- **Idempotent batch processing**: No double-inserts or skipped text
- **Token refresh**: Automatic OAuth token refresh during execution
- **Error recovery**: Graceful handling of API failures
- **Job cleanup**: Automatic cleanup of stale/expired jobs
- **Privacy**: Optional text content scrubbing after 30 days
- **Access revocation**: Detection and handling of revoked Google access

## Development

```bash
# Run development server
npm run dev

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Open Prisma Studio
npm run db:studio
```

## Production Considerations

- Set up proper environment variables
- Configure Google OAuth consent screen
- Set up Inngest production instance
- Configure database backups
- Set up monitoring and logging
- Review and adjust rate limits
- Consider encryption for sensitive data

## License

MIT


