# Pre-Launch Checklist

## 🔴 Critical (Must Do Before Launch)

### 1. Environment Variables Setup
- [ ] **Copy `env.template` to production environment** (Vercel dashboard or hosting platform)
- [ ] **Generate `NEXTAUTH_SECRET`**:
  ```bash
  # Linux/Mac
  openssl rand -base64 32
  
  # Windows PowerShell
  [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
  ```
- [ ] **Set `NEXTAUTH_URL`** to your production domain (e.g., `https://typingisboring.com`)
- [ ] **Set `DATABASE_URL`** to your production PostgreSQL connection string
- [ ] **Set `GOOGLE_CLIENT_ID`** from Google Cloud Console
- [ ] **Set `GOOGLE_CLIENT_SECRET`** from Google Cloud Console
- [ ] **Set `INNGEST_EVENT_KEY`** from Inngest Dashboard
- [ ] **Set `INNGEST_SIGNING_KEY`** from Inngest Dashboard
- [ ] **Set `INNGEST_BASE_URL`** to `https://your-domain.com/api/inngest`
- [ ] **Set `NEXT_PUBLIC_BASE_URL`** to your production domain (for SEO/OG tags)

### 2. Google OAuth Configuration
- [ ] **Create OAuth 2.0 Client ID** in Google Cloud Console
- [ ] **Enable APIs**: Google Docs API, Google Drive API
- [ ] **Configure OAuth Consent Screen**:
  - [ ] App name: "typingisboring"
  - [ ] User support email
  - [ ] Developer contact email
  - [ ] Scopes: `https://www.googleapis.com/auth/drive.file`
- [ ] **Add Authorized Redirect URI**: `https://your-domain.com/api/auth/callback/google`
- [ ] **Test OAuth flow** in production

### 3. Database Setup
- [ ] **Set up production PostgreSQL database**:
  - [ ] Vercel Postgres (recommended), or
  - [ ] Supabase, Railway, Neon, AWS RDS, or Google Cloud SQL
- [ ] **Run Prisma migrations**:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] **Verify database connection**:
  ```bash
  npm run db:studio
  ```
- [ ] **Test database operations** (create user, create job)

### 4. Inngest Configuration
- [ ] **Create Inngest app** at https://app.inngest.com/
- [ ] **Get Event Key and Signing Key** from Inngest dashboard
- [ ] **Configure sync endpoint**: `https://your-domain.com/api/inngest`
- [ ] **Verify Inngest functions are registered**:
  - [ ] `typing-job` function
  - [ ] `typing-batch` function
  - [ ] `cleanup-jobs` function (daily cron)
- [ ] **Test Inngest event dispatch** (start a test job)

### 5. Domain & SSL
- [ ] **Purchase/configure domain** (e.g., typingisboring.com)
- [ ] **Set up DNS records** (if using custom domain)
- [ ] **Verify SSL certificate** is active (automatic with Vercel)
- [ ] **Test HTTPS** on all pages

### 6. Deployment
- [ ] **Connect GitHub repository to Vercel** (or your hosting platform)
- [ ] **Configure build command**: `prisma generate && next build`
- [ ] **Set all environment variables** in hosting platform
- [ ] **Deploy to production**
- [ ] **Verify deployment**:
  - [ ] Landing page loads
  - [ ] Dashboard loads (after login)
  - [ ] API endpoints respond
  - [ ] Health check works: `https://your-domain.com/api/health`

## 🟡 Important (Should Do Before Launch)

### 7. Testing
- [ ] **Test Google OAuth flow**:
  - [ ] First-time sign-up
  - [ ] Returning login
  - [ ] Cancelled consent
  - [ ] Revoked access handling
- [ ] **Test typing job flow**:
  - [ ] Start job with short text
  - [ ] Start job with long text (near max)
  - [ ] Pause job
  - [ ] Resume job
  - [ ] Stop job
  - [ ] Complete job naturally
- [ ] **Test edge cases**:
  - [ ] Empty text (should fail validation)
  - [ ] Max characters (50,000)
  - [ ] No document selected (should fail)
  - [ ] Concurrent job prevention
- [ ] **Test on multiple devices**:
  - [ ] Desktop (Chrome, Firefox, Safari, Edge)
  - [ ] Mobile (iOS Safari, Android Chrome)
  - [ ] Tablet
- [ ] **Test responsive design**:
  - [ ] Small phone (< 375px)
  - [ ] Large phone (375-768px)
  - [ ] Tablet (768-1024px)
  - [ ] Desktop (> 1024px)

### 8. Legal Pages Content
- [ ] **Review Terms of Service** (`/terms`):
  - [ ] Update contact information
  - [ ] Verify all sections are accurate
  - [ ] Add support email/contact method
- [ ] **Review Privacy Policy** (`/privacy`):
  - [ ] Verify data practices match actual implementation
  - [ ] Add contact method for privacy requests
  - [ ] Verify user rights are clearly stated
- [ ] **Review Cookie Notice** (`/cookies`):
  - [ ] Verify cookie usage is accurate
  - [ ] Add contact method if needed
- [ ] **Verify legal links** in sign-up footer work correctly

### 9. SEO & Meta
- [ ] **Create Open Graph image** (`/public/og-image.png`):
  - [ ] Dimensions: 1200x630px
  - [ ] Includes app logo/branding
  - [ ] Includes tagline: "Natural typing for Google Docs"
- [ ] **Create app icons**:
  - [ ] Verify `/public/icon-192.png` exists (192x192px)
  - [ ] Create `/public/icon-512.png` (512x512px) if missing
  - [ ] Icons should be maskable (80% safe zone)
- [ ] **Set `NEXT_PUBLIC_BASE_URL`** environment variable
- [ ] **Test meta tags**:
  - [ ] Use [Open Graph Debugger](https://developers.facebook.com/tools/debug/)
  - [ ] Use [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [ ] **Verify page titles**:
  - [ ] Landing page: "typingisboring - Natural typing for Google Docs"
  - [ ] Dashboard: "Dashboard | typingisboring"

### 10. Security
- [ ] **Verify HTTPS** is enforced (automatic with Vercel)
- [ ] **Check environment variables** are not exposed:
  - [ ] No secrets in client-side code
  - [ ] No secrets in GitHub repository
  - [ ] `.env` files in `.gitignore`
- [ ] **Review API security**:
  - [ ] All endpoints require authentication
  - [ ] Ownership checks in place
  - [ ] Rate limiting configured
  - [ ] Input validation working
- [ ] **Test error handling**:
  - [ ] Invalid inputs return proper errors
  - [ ] Unauthorized access returns 403
  - [ ] No sensitive data in error messages

## 🟢 Recommended (Nice to Have)

### 11. Monitoring & Observability
- [ ] **Set up error tracking** (Sentry recommended):
  ```bash
  npm install @sentry/nextjs
  ```
  - [ ] Configure Sentry DSN
  - [ ] Initialize client and server configs
  - [ ] Test error reporting
- [ ] **Set up analytics** (Vercel Analytics recommended):
  ```bash
  npm install @vercel/analytics
  ```
  - [ ] Add `<Analytics />` to `app/layout.tsx`
  - [ ] Verify analytics dashboard works
- [ ] **Set up uptime monitoring**:
  - [ ] UptimeRobot or similar service
  - [ ] Monitor `/api/health` endpoint
  - [ ] Configure alert thresholds
  - [ ] Set up email/Slack notifications
- [ ] **Set up log aggregation**:
  - [ ] Vercel Logs (built-in) or
  - [ ] Datadog, Logtail, or Axiom
  - [ ] Verify structured logs are being collected

### 12. Performance
- [ ] **Run Lighthouse audit**:
  - [ ] Landing page: Target 90+ Performance score
  - [ ] Dashboard: Target 90+ Performance score
- [ ] **Test on slow connections**:
  - [ ] 3G throttling
  - [ ] Verify loading states work
  - [ ] Verify error handling works
- [ ] **Check bundle size**:
  - [ ] Run `npm run build`
  - [ ] Review bundle analysis
  - [ ] Verify no unexpected large dependencies

### 13. Content & Copy
- [ ] **Review all user-facing text**:
  - [ ] Landing page hero copy
  - [ ] Dashboard instructions
  - [ ] Error messages
  - [ ] Toast notifications
  - [ ] Empty states
- [ ] **Verify brand consistency**:
  - [ ] All references say "typingisboring" (not "TypeFlow")
  - [ ] Consistent tone and voice
  - [ ] No placeholder text remaining

### 14. Documentation
- [ ] **Create user documentation** (if needed):
  - [ ] How to use the app
  - [ ] FAQ
  - [ ] Troubleshooting guide
- [ ] **Update README.md**:
  - [ ] Installation instructions
  - [ ] Environment setup
  - [ ] Deployment instructions
- [ ] **Document API** (if exposing to others):
  - [ ] API endpoints
  - [ ] Authentication
  - [ ] Rate limits

## 🔵 Optional (Post-Launch)

### 15. Marketing & Growth
- [ ] **Set up social media accounts** (if applicable)
- [ ] **Create launch announcement** (blog post, social media)
- [ ] **Set up feedback collection** (user surveys, support email)
- [ ] **Plan feature roadmap** (based on user feedback)

### 16. Support
- [ ] **Set up support email** or help desk
- [ ] **Create support documentation**
- [ ] **Set up user feedback mechanism**
- [ ] **Plan response time for support requests**

## Pre-Launch Verification

### Final Checks
- [ ] **All environment variables set** and verified
- [ ] **Database migrations applied** successfully
- [ ] **OAuth working** end-to-end
- [ ] **Inngest functions registered** and working
- [ ] **Health check endpoint** responding
- [ ] **All pages load** without errors
- [ ] **Typing flow works** end-to-end
- [ ] **Mobile responsive** design verified
- [ ] **Legal pages** accessible and accurate
- [ ] **SEO meta tags** configured
- [ ] **No console errors** in production
- [ ] **No build warnings** or errors

### Smoke Test Checklist
1. [ ] Visit landing page → Should load without errors
2. [ ] Click "Start typing in Google Docs" → Should initiate OAuth
3. [ ] Complete OAuth → Should redirect to dashboard
4. [ ] Paste text → Should accept input
5. [ ] Select/create document → Should work
6. [ ] Start typing job → Should start successfully
7. [ ] View progress → Should update in real-time
8. [ ] Pause job → Should pause correctly
9. [ ] Resume job → Should resume correctly
10. [ ] Stop job → Should stop and unlock document
11. [ ] View job history → Should show completed jobs
12. [ ] View analytics → Should show stats
13. [ ] Change settings → Should save preferences
14. [ ] Sign out → Should log out successfully

## Launch Day

### Before Going Live
- [ ] **Backup database** (if possible)
- [ ] **Notify team** (if applicable)
- [ ] **Monitor error tracking** dashboard
- [ ] **Monitor analytics** dashboard
- [ ] **Have rollback plan** ready (if needed)

### After Launch
- [ ] **Monitor error rates** (should be < 1%)
- [ ] **Monitor job success rates** (should be > 95%)
- [ ] **Check user feedback** channels
- [ ] **Monitor performance** metrics
- [ ] **Review logs** for any issues
- [ ] **Be ready to respond** to issues quickly

## Quick Reference

### Essential Commands
```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npx prisma migrate deploy

# Build for production
npm run build

# Test production build locally
npm run start

# Lint code
npm run lint
```

### Essential URLs to Test
- Landing: `https://your-domain.com/`
- Dashboard: `https://your-domain.com/dashboard`
- Health: `https://your-domain.com/api/health`
- Terms: `https://your-domain.com/terms`
- Privacy: `https://your-domain.com/privacy`
- Cookies: `https://your-domain.com/cookies`

### Support Resources
- **Documentation**: See `docs/` folder
- **Environment Setup**: `docs/ENVIRONMENT_SETUP.md`
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **Monitoring Guide**: `docs/MONITORING.md`

---

**Status**: Ready for launch after completing Critical and Important items.

**Estimated Time**: 2-4 hours for critical items, 4-8 hours total including testing and monitoring setup.







