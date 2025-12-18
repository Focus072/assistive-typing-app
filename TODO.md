# TODO List - typingisboring

## 🔴 Critical / High Priority

### Database Migration
- [ ] Run Prisma migration for `testWPM` field
  ```bash
  npx prisma migrate dev --name add_test_wpm
  ```
- [ ] Verify migration completed successfully
- [ ] Test that jobs can be created with `testWPM` field

### Authentication & Session Management
- [ ] Test persistent authentication:
  - [ ] Log in → Close browser → Reopen → Should still be logged in
  - [ ] Verify session persists for 30 days
  - [ ] Test sign out clears session everywhere
- [ ] Verify home page shows correct buttons:
  - [ ] Shows "Dashboard" + "Sign Out" when logged in
  - [ ] Shows "Login" when not logged in
- [ ] Test that `/login` redirects to home page correctly

## 🟡 Medium Priority

### Typing Test Feature
- [ ] Test typing test completion:
  - [ ] Verify test completes when all characters are typed
  - [ ] Verify WPM calculation is accurate (correct chars ÷ 5 ÷ minutes)
  - [ ] Test with different typing speeds
  - [ ] Verify accuracy calculation works correctly
- [ ] Test typing test integration:
  - [ ] Create job with typing test profile
  - [ ] Verify WPM from test is used in typing engine
  - [ ] Verify typing speed matches test WPM

### Type/Paste Mode Toggle
- [ ] Test Type/Paste mode toggle:
  - [ ] Verify buttons appear on first visit
  - [ ] Verify buttons disappear after selection
  - [ ] Test mode persists when navigating away and back
  - [ ] Verify Type mode has better styling (larger font, sans-serif)
  - [ ] Verify Paste mode uses original styling
- [ ] Test mode selection:
  - [ ] Select Type mode → Type text → Verify styling
  - [ ] Select Paste mode → Paste text → Verify styling
  - [ ] Clear text → Verify buttons reappear

### UI/UX Improvements
- [ ] Test responsive design on mobile devices
- [ ] Test all modals (Preview, Format Metadata, Custom Format, Typing Test)
- [ ] Verify keyboard shortcuts work correctly
- [ ] Test dark/light theme switching

## 🟢 Low Priority / Nice to Have

### Code Quality
- [ ] Remove any debug/console.log statements
- [ ] Review and clean up TypeScript types
- [ ] Add error boundaries for better error handling
- [ ] Add loading states where missing

### Documentation
- [ ] Update README with new features:
  - [ ] Typing test feature
  - [ ] Type/Paste mode toggle
  - [ ] Persistent authentication
- [ ] Document environment variables needed
- [ ] Add setup instructions for new developers

### Testing
- [ ] Test edge cases:
  - [ ] Very long text (50k+ characters)
  - [ ] Very short text (1 word)
  - [ ] Special characters and emojis
  - [ ] Empty text input
- [ ] Test error scenarios:
  - [ ] Network failures
  - [ ] Google OAuth errors
  - [ ] Invalid document IDs
  - [ ] Expired sessions

### Performance
- [ ] Test typing performance with large documents
- [ ] Verify no memory leaks during long typing sessions
- [ ] Check bundle size and optimize if needed

### Security
- [ ] Review session cookie security settings
- [ ] Verify CSRF protection is working
- [ ] Check rate limiting on API endpoints
- [ ] Review OAuth scopes (ensure minimal permissions)

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Set up production environment variables:
  - [ ] `NEXTAUTH_SECRET` (generate secure random string)
  - [ ] `NEXTAUTH_URL` (production URL)
  - [ ] `GOOGLE_CLIENT_ID` (production OAuth credentials)
  - [ ] `GOOGLE_CLIENT_SECRET` (production OAuth credentials)
  - [ ] `DATABASE_URL` (production database)
- [ ] Run production build: `npm run build`
- [ ] Test production build locally
- [ ] Set up error monitoring (Sentry, etc.)

### Database
- [ ] Run migrations on production database
- [ ] Verify database connection
- [ ] Set up database backups

### OAuth Setup
- [ ] Update Google OAuth redirect URIs for production
- [ ] Test OAuth flow in production
- [ ] Verify refresh tokens are working

### Post-Deployment
- [ ] Monitor error logs
- [ ] Test critical user flows:
  - [ ] Sign up / Login
  - [ ] Create typing job
  - [ ] Complete typing test
  - [ ] Type document
- [ ] Set up analytics tracking
- [ ] Monitor performance metrics

## 📋 Feature Ideas (Future)

- [ ] Writing templates & outlines
- [ ] Citation generator (MLA/APA/Chicago)
- [ ] Writing analytics dashboard
- [ ] Writing streaks & goals
- [ ] Grammar & style checker
- [ ] Export & sharing features
- [ ] Focus mode / Pomodoro timer
- [ ] Writing history & version control
- [ ] Thesaurus & dictionary integration

## 🔧 Maintenance

### Weekly
- [ ] Review error logs
- [ ] Check for failed jobs
- [ ] Monitor database performance

### Monthly
- [ ] Update dependencies
- [ ] Review and optimize database queries
- [ ] Check for security updates
- [ ] Review user feedback

---

**Priority Legend:**
- 🔴 Critical: Must do before launch
- 🟡 Medium: Should do soon
- 🟢 Low: Nice to have
- 🚀 Deployment: Production readiness
- 📋 Future: Ideas for later

