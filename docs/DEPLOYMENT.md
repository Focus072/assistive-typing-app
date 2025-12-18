# Infrastructure, Deployment & Monitoring

## Environment Variables

### Required Environment Variables

Based on `env.template`, the following environment variables must be set in production:

#### NextAuth Configuration
```env
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-random-secret-key>
```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

#### Database
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

**Production Database Options**:
- Vercel Postgres
- Supabase
- Railway
- Neon
- AWS RDS
- Google Cloud SQL

#### Google OAuth
```env
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
```

**OAuth Redirect URI** (set in Google Cloud Console):
- Production: `https://your-domain.com/api/auth/callback/google`
- Development: `http://localhost:3000/api/auth/callback/google`

#### Inngest
```env
INNGEST_EVENT_KEY=<from-inngest-dashboard>
INNGEST_SIGNING_KEY=<from-inngest-dashboard>
INNGEST_BASE_URL=https://your-domain.com/api/inngest
```

**For Local Development**:
```env
INNGEST_BASE_URL=http://localhost:3000/api/inngest
```

#### Optional: Base URL for SEO
```env
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Environment Variable Checklist

- [ ] `NEXTAUTH_URL` - Production domain
- [ ] `NEXTAUTH_SECRET` - Random secret key (32+ characters)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `INNGEST_EVENT_KEY` - From Inngest Dashboard
- [ ] `INNGEST_SIGNING_KEY` - From Inngest Dashboard
- [ ] `INNGEST_BASE_URL` - Production Inngest endpoint
- [ ] `NEXT_PUBLIC_BASE_URL` - For Open Graph tags (optional)

## Database Migrations

### Prisma Setup

1. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

2. **Run Migrations**:
   ```bash
   npm run db:migrate
   ```

3. **For Production**:
   ```bash
   npx prisma migrate deploy
   ```

### Migration Checklist

- [ ] Database schema matches `prisma/schema.prisma`
- [ ] All migrations applied to production database
- [ ] Prisma Client generated (`npm run db:generate`)
- [ ] Database connection tested
- [ ] Indexes created (userId, status, createdAt)

## Next.js Configuration

### Production Readiness

**Current `next.config.js`**:
```javascript
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  turbopack: {},
}
```

**Status**: ✅ Production-ready
- No dev-only toggles
- Appropriate body size limit for text content
- Turbopack config (Next.js 16 default)

### Build Process

**Build Command**:
```bash
npm run build
```

**Build Steps**:
1. `prisma generate` - Generate Prisma Client
2. `next build` - Build Next.js application

**Expected Output**:
- No TypeScript errors
- No build warnings
- Successful compilation
- Static pages generated
- API routes compiled

## CI/CD Pipeline

### Recommended Setup: GitHub → Vercel

#### GitHub Actions (Optional)

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - run: npm run lint
      
      - run: npm run db:generate
      
      - run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}
```

#### Vercel Deployment

**Automatic Deployment**:
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Vercel automatically deploys on push to main branch

**Manual Deployment**:
```bash
vercel --prod
```

**Vercel Configuration** (`vercel.json` - optional):
```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### CI/CD Checklist

- [ ] GitHub repository connected to Vercel
- [ ] Environment variables set in Vercel dashboard
- [ ] Build command: `prisma generate && next build`
- [ ] Lint check passes before deploy
- [ ] Build check passes before deploy
- [ ] Automatic deployments enabled
- [ ] Preview deployments for PRs enabled

## Production Build Testing

### Local Production Build

**Test Production Build Locally**:
```bash
npm run build
npm run start
```

**Check for**:
- [ ] No TypeScript errors
- [ ] No build warnings
- [ ] All pages compile successfully
- [ ] API routes compile successfully
- [ ] Static assets generated
- [ ] No missing dependencies

**Common Issues**:
- Prisma Client not generated → Run `npm run db:generate`
- Missing environment variables → Check `.env.local`
- Type errors → Fix TypeScript issues
- Import errors → Check import paths

## Error Tracking

### Recommended: Sentry

**Installation**:
```bash
npm install @sentry/nextjs
```

**Setup** (`sentry.client.config.ts`):
```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies
    }
    return event
  },
})
```

**Setup** (`sentry.server.config.ts`):
```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})
```

**Next.js Integration** (`next.config.js`):
```javascript
const { withSentryConfig } = require("@sentry/nextjs")

const nextConfig = {
  // ... existing config
}

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: "your-org",
  project: "your-project",
})
```

**Environment Variables**:
```env
SENTRY_DSN=<from-sentry-dashboard>
NEXT_PUBLIC_SENTRY_DSN=<from-sentry-dashboard>
```

### Error Tracking Checklist

- [ ] Sentry (or similar) installed and configured
- [ ] Client-side error tracking enabled
- [ ] Server-side error tracking enabled
- [ ] Sensitive data filtered from error reports
- [ ] Error boundaries report to Sentry
- [ ] API errors logged to Sentry

## Logging

### Current Logging Strategy

**Production Logging**:
- Only critical errors logged
- Errors sanitized (no stack traces in production)
- Development logs disabled in production

**Job Event Logging**:
- Job lifecycle events stored in `JobEvent` table
- Events include: started, paused, resumed, stopped, failed, completed
- Event details stored as JSON

### Enhanced Logging (Recommended)

**Structured Logging**:
```typescript
// lib/logger.ts
export const logger = {
  job: {
    start: (jobId: string, userId: string) => {
      console.log(JSON.stringify({
        type: 'job.start',
        jobId,
        userId,
        timestamp: new Date().toISOString(),
      }))
    },
    stop: (jobId: string, userId: string, reason: string) => {
      console.log(JSON.stringify({
        type: 'job.stop',
        jobId,
        userId,
        reason,
        timestamp: new Date().toISOString(),
      }))
    },
    fail: (jobId: string, userId: string, error: string) => {
      console.error(JSON.stringify({
        type: 'job.fail',
        jobId,
        userId,
        error,
        timestamp: new Date().toISOString(),
      }))
    },
  },
}
```

**Log Aggregation Options**:
- Vercel Logs (built-in)
- Datadog
- Logtail
- Axiom
- CloudWatch (AWS)

### Logging Checklist

- [ ] Job start events logged
- [ ] Job stop events logged
- [ ] Job fail events logged
- [ ] Error events logged with context
- [ ] Logs aggregated in centralized system
- [ ] Log retention policy defined

## Analytics

### Privacy-Respecting Analytics

**Recommended: Vercel Analytics** (Privacy-focused):
```bash
npm install @vercel/analytics
```

**Setup** (`app/layout.tsx`):
```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Alternative: Plausible** (GDPR-compliant):
- No cookies
- No personal data collection
- Self-hosted option available

### Product Analytics

**Key Metrics to Track**:
- Jobs started per day
- Jobs completed per day
- Average job duration
- Error rate
- User retention
- Feature usage

**Implementation**:
```typescript
// lib/analytics.ts
export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to analytics service
      // Respect user privacy preferences
    }
  },
}
```

### Analytics Checklist

- [ ] Analytics service chosen (Vercel Analytics recommended)
- [ ] Privacy policy updated to mention analytics
- [ ] No personal data collected
- [ ] User consent obtained (if required by jurisdiction)
- [ ] Key metrics tracked
- [ ] Analytics dashboard configured

## Monitoring

### Health Checks

**Create** `app/api/health/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    )
  }
}
```

### Uptime Monitoring

**Recommended Services**:
- UptimeRobot (free tier available)
- Pingdom
- StatusCake
- Vercel Analytics (built-in)

**Monitor Endpoints**:
- `/api/health` - Application health
- `/` - Landing page
- `/dashboard` - Dashboard (requires auth)

### Monitoring Checklist

- [ ] Health check endpoint created (`/api/health`)
- [ ] Database connection monitored
- [ ] Uptime monitoring configured
- [ ] Alert thresholds set
- [ ] Notification channels configured (email, Slack, etc.)

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in production
- [ ] Database migrations applied
- [ ] Prisma Client generated
- [ ] Production build tested locally
- [ ] Lint checks pass
- [ ] TypeScript checks pass

### Deployment

- [ ] CI/CD pipeline configured
- [ ] Automatic deployments enabled
- [ ] Preview deployments for PRs enabled
- [ ] Environment variables configured
- [ ] Build command correct

### Post-Deployment

- [ ] Health check endpoint responding
- [ ] Database connection working
- [ ] Google OAuth working
- [ ] Inngest functions registered
- [ ] Error tracking working
- [ ] Analytics tracking working
- [ ] Uptime monitoring configured

## Troubleshooting

### Common Issues

1. **Build Fails**:
   - Check Prisma Client generation
   - Verify environment variables
   - Check TypeScript errors

2. **Database Connection Fails**:
   - Verify `DATABASE_URL` format
   - Check database accessibility
   - Verify credentials

3. **OAuth Not Working**:
   - Verify redirect URI matches
   - Check client ID/secret
   - Verify `NEXTAUTH_URL` matches domain

4. **Inngest Not Working**:
   - Verify `INNGEST_BASE_URL` matches domain
   - Check event key and signing key
   - Verify Inngest functions registered

## Next Steps

1. **Set up production environment variables**
2. **Run database migrations**
3. **Configure CI/CD pipeline**
4. **Set up error tracking (Sentry)**
5. **Configure logging aggregation**
6. **Set up analytics (Vercel Analytics)**
7. **Configure uptime monitoring**
8. **Test production deployment**







