# Validation Checklist

## ✅ Step 1: Database Migration

### Run Migration
```bash
npx prisma migrate dev --name add_test_wpm
```

### Verify Migration
- [ ] Migration completed without errors
- [ ] Check `prisma/migrations` folder for new migration file
- [ ] Verify `testWPM` field exists in database:
  ```bash
  npx prisma studio
  # Check Job model - should see testWPM field
  ```

### Test Database Schema
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Verify TypeScript types include `testWPM`

---

## ✅ Step 2: Authentication Persistence

### Configuration Check
- [ ] Verify `lib/auth.ts` has:
  - `session.maxAge: 30 * 24 * 60 * 60` (30 days)
  - `session.updateAge: 24 * 60 * 60` (24 hours)
  - `cookies.sessionToken.maxAge: 30 * 24 * 60 * 60`
  - `pages.signIn: "/"` (home page, not /login)

### Session Provider Check
- [ ] Verify `components/providers.tsx` has:
  - `refetchInterval={5 * 60}` (5 minutes)
  - `refetchOnWindowFocus={true}`

### Manual Testing
1. **Login Test:**
   - [ ] Log in with Google
   - [ ] Verify session cookie is set (check browser DevTools → Application → Cookies)
   - [ ] Cookie should have `maxAge` of 30 days

2. **Persistence Test:**
   - [ ] Log in
   - [ ] Close browser completely
   - [ ] Reopen browser and navigate to site
   - [ ] Should still be logged in
   - [ ] Home page should show "Dashboard" and "Sign Out" buttons

3. **Sign Out Test:**
   - [ ] Click "Sign Out"
   - [ ] Verify session cookie is removed
   - [ ] Should redirect to home page
   - [ ] Home page should show "Login" button

4. **Navigation Test:**
   - [ ] While logged in, navigate to `/login`
   - [ ] Should redirect to `/dashboard` (if authenticated) or `/` (if not)

---

## ✅ Step 3: Typing Test Feature - End-to-End Validation

### Component Integration
- [ ] Verify `TypingTest` component exists and is imported correctly
- [ ] Verify `TypingProfileSelector` includes "typing-test" option
- [ ] Verify typing test modal opens when "Typing Test" profile is selected

### Typing Test Flow
1. **Open Test:**
   - [ ] Click "Typing Test" profile option
   - [ ] Modal should open
   - [ ] Should show test text

2. **Take Test:**
   - [ ] Click "Start Test"
   - [ ] Type the test text
   - [ ] Verify WPM updates in real-time
   - [ ] Verify accuracy updates in real-time
   - [ ] Verify character coloring (green=correct, red=incorrect, gray=pending)

3. **Complete Test:**
   - [ ] Type all characters
   - [ ] Test should complete automatically when last character is typed
   - [ ] Should show final WPM
   - [ ] Should show "Use X WPM Profile" button

4. **Use Profile:**
   - [ ] Click "Use X WPM Profile"
   - [ ] Modal should close
   - [ ] Typing profile should be set to "typing-test"
   - [ ] WPM should be displayed in profile selector

### API Integration
- [ ] Create a job with typing-test profile
- [ ] Verify `testWPM` is sent in API request
- [ ] Verify job is created with `testWPM` field in database
- [ ] Verify typing engine uses `testWPM` for delay calculation

### Typing Engine Validation
- [ ] Verify `lib/typing-delays.ts` has `getWPMRange()` function
- [ ] Verify `buildDelayPlan()` accepts `testWPM` parameter
- [ ] Verify delays are calculated based on test WPM when profile is "typing-test"
- [ ] Verify typing speed matches test WPM (approximately)

---

## ✅ Step 4: Type/Paste Mode Toggle

### Initial State
- [ ] Visit home page with empty textarea
- [ ] Should see "Type" and "Paste" buttons centered
- [ ] Should see "or" text between buttons
- [ ] No placeholder text should be visible

### Mode Selection
- [ ] Click "Type" button
- [ ] Buttons should disappear
- [ ] Textarea should have larger font, sans-serif, better spacing
- [ ] Placeholder should say "Start typing your essay..."

- [ ] Click "Paste" button (or reset and select Paste)
- [ ] Buttons should disappear
- [ ] Textarea should have original styling (monospace, smaller font)
- [ ] Placeholder should say "Paste or type the text..."

### Persistence
- [ ] Select a mode
- [ ] Navigate away from page
- [ ] Return to page with empty textarea
- [ ] Buttons should reappear (mode resets when empty)

- [ ] Select a mode and type text
- [ ] Navigate away
- [ ] Return to page
- [ ] Text should still be there
- [ ] Mode indicator should show in top-right corner

---

## ✅ Step 5: Integration Testing

### Full User Flow
1. **New User:**
   - [ ] Visit home page → See "Login" button
   - [ ] Click "Login" → Google OAuth flow
   - [ ] Redirected to dashboard
   - [ ] Return to home → See "Dashboard" and "Sign Out" buttons

2. **Typing Test Flow:**
   - [ ] Select "Typing Test" profile
   - [ ] Take typing test
   - [ ] Complete test and use WPM
   - [ ] Select Type or Paste mode
   - [ ] Enter text
   - [ ] Select document
   - [ ] Start typing job
   - [ ] Verify job uses test WPM for typing speed

3. **Session Persistence:**
   - [ ] Log in
   - [ ] Close browser
   - [ ] Reopen → Still logged in
   - [ ] Create job → Should work
   - [ ] Sign out → Session cleared
   - [ ] Try to access dashboard → Redirected to home

---

## 🔧 Quick Fixes if Issues Found

### Database Migration Fails
```bash
# If migration fails, try:
npx prisma db push
npx prisma generate
```

### Authentication Not Persisting
- Check browser cookies are enabled
- Verify `NEXTAUTH_SECRET` is set
- Check cookie settings in `lib/auth.ts`

### Typing Test Not Completing
- Verify completion logic checks `userInput.length === TARGET_TEXT.length`
- Check console for errors
- Verify WPM calculation is correct

### Type/Paste Mode Not Persisting
- Check localStorage in browser DevTools
- Verify `STORAGE_KEY` is consistent
- Check mode selection logic

---

## 📝 Notes

- All validations should pass before deployment
- Test in both development and production-like environments
- Verify on multiple browsers (Chrome, Firefox, Safari)
- Test on mobile devices







