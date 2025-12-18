# Monitoring & Observability

## Error Tracking

### Recommended: Sentry

**Why Sentry**:
- Automatic error capture
- Source map support
- User context tracking
- Performance monitoring
- Release tracking

**Setup Steps**:

1. **Install Sentry**:
   ```bash
   npm install @sentry/nextjs
   ```

2. **Initialize Sentry** (`sentry.client.config.ts`):
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
       // Don't send user email in production
       if (event.user?.email && process.env.NODE_ENV === "production") {
         event.user.email = "[REDACTED]"
       }
       return event
     },
   })
   ```

3. **Initialize Server Sentry** (`sentry.server.config.ts`):
   ```typescript
   import * as Sentry from "@sentry/nextjs"

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
   })
   ```

4. **Update Next.js Config** (`next.config.js`):
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

5. **Add Environment Variables**:
   ```env
   SENTRY_DSN=<from-sentry-dashboard>
   NEXT_PUBLIC_SENTRY_DSN=<from-sentry-dashboard>
   SENTRY_AUTH_TOKEN=<for-source-maps>
   ```

**Alternative Options**:
- **LogRocket**: Session replay + error tracking
- **Rollbar**: Error tracking with context
- **Bugsnag**: Error monitoring
- **Vercel Analytics**: Built-in error tracking (limited)

## Logging

### Current Logging Implementation

**Structured Logging** (`lib/logger.ts`):
- Development: Full console logs
- Production: JSON-structured logs
- Job events: Structured with context

**Job Event Logging**:
- `job.start`: Logged when job starts
- `job.stop`: Logged when job stops
- `job.fail`: Logged when job fails
- `job.complete`: Logged when job completes
- `job.pause`: Logged when job pauses
- `job.resume`: Logged when job resumes

### Log Aggregation

**Recommended Services**:

1. **Vercel Logs** (Built-in):
   - Automatic log collection
   - Real-time log streaming
   - Search and filter
   - Free tier available

2. **Datadog**:
   - Advanced log aggregation
   - APM integration
   - Custom dashboards
   - Alerting

3. **Logtail**:
   - Simple log aggregation
   - Real-time tailing
   - Search and filter
   - Affordable pricing

4. **Axiom**:
   - Fast log queries
   - No data retention limits
   - Good for high-volume logging

### Log Format

**Structured JSON Logs**:
```json
{
  "type": "job.start",
  "jobId": "clx123...",
  "userId": "clx456...",
  "timestamp": "2024-12-01T10:00:00.000Z",
  "documentId": "1a2b3c...",
  "totalChars": 5000,
  "durationMinutes": 30,
  "typingProfile": "steady"
}
```

**Benefits**:
- Easy to parse and query
- Consistent format
- Searchable fields
- Aggregatable metrics

## Analytics

### Privacy-Respecting Analytics

**Recommended: Vercel Analytics**:

1. **Install**:
   ```bash
   npm install @vercel/analytics
   ```

2. **Setup** (`app/layout.tsx`):
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

**Features**:
- No cookies
- GDPR compliant
- Privacy-focused
- Real-time metrics
- Free tier

**Alternative: Plausible**:
- Self-hosted option
- No cookies
- GDPR compliant
- Simple dashboard

### Product Analytics

**Key Metrics to Track**:

1. **Job Metrics**:
   - Jobs started per day
   - Jobs completed per day
   - Jobs failed per day
   - Average job duration
   - Average characters typed

2. **User Metrics**:
   - Active users per day/week/month
   - New users per day
   - User retention rate
   - Average jobs per user

3. **Performance Metrics**:
   - Average typing speed (WPM)
   - Job completion rate
   - Error rate
   - API response times

4. **Feature Usage**:
   - Typing profile distribution
   - Document format usage
   - Most common duration settings

**Implementation** (`lib/analytics.ts`):
```typescript
export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Send to analytics service
      // Example: Vercel Analytics, Plausible, etc.
      // Respect user privacy preferences
    }
  },
  
  job: {
    start: (properties: { durationMinutes: number; typingProfile: string }) => {
      analytics.track('job_started', properties)
    },
    complete: (properties: { totalChars: number; durationMinutes: number }) => {
      analytics.track('job_completed', properties)
    },
    fail: (properties: { errorCode: string }) => {
      analytics.track('job_failed', properties)
    },
  },
}
```

## Health Checks

### Health Check Endpoint

**Created**: `app/api/health/route.ts`

**Endpoint**: `/api/health`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-01T10:00:00.000Z",
  "service": "typingisboring"
}
```

**Unhealthy Response** (503):
```json
{
  "status": "unhealthy",
  "error": "Database connection failed",
  "timestamp": "2024-12-01T10:00:00.000Z"
}
```

### Uptime Monitoring

**Recommended Services**:

1. **UptimeRobot** (Free tier):
   - Monitor `/api/health` endpoint
   - 5-minute check interval (free)
   - Email/SMS alerts
   - Status page

2. **Pingdom**:
   - Advanced monitoring
   - Real user monitoring
   - Transaction monitoring

3. **StatusCake**:
   - Free tier available
   - Multiple check types
   - Alerting

**Monitor These Endpoints**:
- `/api/health` - Application health
- `/` - Landing page availability
- `/api/auth/signin` - Auth endpoint

## Alerting

### Recommended Alert Rules

1. **Error Rate**:
   - Alert if error rate > 1% in 5 minutes
   - Alert if > 10 errors in 1 minute

2. **Job Failures**:
   - Alert if job failure rate > 5% in 1 hour
   - Alert if > 20 failed jobs in 1 hour

3. **Database**:
   - Alert if database connection fails
   - Alert if query time > 5 seconds

4. **Uptime**:
   - Alert if health check fails
   - Alert if downtime > 1 minute

### Alert Channels

- **Email**: For critical alerts
- **Slack**: For team notifications
- **PagerDuty**: For on-call escalation
- **SMS**: For critical outages

## Dashboards

### Recommended Metrics Dashboard

**Key Metrics to Display**:

1. **Overview**:
   - Total jobs today
   - Active jobs
   - Failed jobs
   - Average job duration

2. **Performance**:
   - Average WPM
   - Job completion rate
   - Error rate
   - API response times

3. **Users**:
   - Active users (DAU/WAU/MAU)
   - New users today
   - User retention

4. **System**:
   - Database connection status
   - Inngest function status
   - API health
   - Error trends

**Dashboard Tools**:
- **Vercel Analytics Dashboard**: Built-in
- **Grafana**: Custom dashboards
- **Datadog**: Advanced dashboards
- **Custom Dashboard**: Build with your analytics data

## Monitoring Checklist

### Error Tracking
- [ ] Sentry (or similar) installed
- [ ] Client-side errors tracked
- [ ] Server-side errors tracked
- [ ] Error boundaries report to Sentry
- [ ] Sensitive data filtered

### Logging
- [ ] Structured logging implemented
- [ ] Job events logged
- [ ] Log aggregation configured
- [ ] Log retention policy set
- [ ] Log search and filter working

### Analytics
- [ ] Analytics service configured
- [ ] Privacy policy updated
- [ ] Key metrics tracked
- [ ] Dashboard configured
- [ ] User consent obtained (if required)

### Health Checks
- [ ] Health check endpoint created
- [ ] Database connection monitored
- [ ] Uptime monitoring configured
- [ ] Alert thresholds set
- [ ] Notification channels configured

### Dashboards
- [ ] Metrics dashboard created
- [ ] Key metrics displayed
- [ ] Real-time updates enabled
- [ ] Historical data available

## Next Steps

1. **Set up Sentry** for error tracking
2. **Configure log aggregation** (Vercel Logs or Datadog)
3. **Add Vercel Analytics** for privacy-respecting analytics
4. **Set up uptime monitoring** (UptimeRobot)
5. **Create monitoring dashboard**
6. **Configure alerting** (email, Slack)







