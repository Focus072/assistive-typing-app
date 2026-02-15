# OAuth Account Creation Error - Debugging & Fixes

## Issues Fixed

### 1. Enhanced `createUser` Error Handling
**File:** `lib/auth.ts` (lines 17-80)

**Changes:**
- ✅ Added email validation before attempting user creation
- ✅ Added duplicate email check (handles race conditions)
- ✅ Improved error logging with Prisma error codes
- ✅ Handles P2002 (unique constraint violation) gracefully by fetching existing user
- ✅ Ensures all required fields have defaults (name, image, emailVerified can be null)

**What this fixes:**
- Prevents crashes when user already exists (concurrent sign-ins)
- Provides clear error messages for debugging
- Handles missing optional fields gracefully

### 2. Enhanced `linkAccount` Error Handling
**File:** `lib/auth.ts` (lines 81-145)

**Changes:**
- ✅ Added validation for required fields (userId, provider, providerAccountId)
- ✅ Added duplicate account check before linking
- ✅ Handles P2002 errors for duplicate accounts
- ✅ Improved error logging

**What this fixes:**
- Prevents account linking failures when account already exists
- Better error messages for debugging

### 3. Enhanced `signIn` Callback
**File:** `lib/auth.ts` (lines 269-331)

**Changes:**
- ✅ Added comprehensive logging of OAuth data
- ✅ Validates email presence and tries multiple sources (user.email, profile.email, profile.emails[0].value)
- ✅ Ensures name and image are populated from profile if missing
- ✅ Better error messages

**What this fixes:**
- Catches missing email issues early
- Ensures all user data is properly mapped from Google OAuth

## Debugging Checklist

### 1. Check Terminal Logs
Look for these log messages when signing in:
```
[AUTH] signIn callback: { hasUser, userEmail, ... }
[AUTH] createUser: Missing email field
[AUTH] User already exists, returning existing user
[AUTH] createUser error: { code, message, meta, ... }
```

### 2. Verify Database Schema
**File:** `prisma/schema.prisma`

Ensure these fields allow null:
- ✅ `emailVerified DateTime?` - Already nullable
- ✅ `password String?` - Already nullable  
- ✅ `name String?` - Already nullable
- ✅ `image String?` - Already nullable
- ✅ `subscriptionStatus String?` - Already nullable

### 3. Check Google OAuth Configuration
**File:** `lib/auth.ts` (lines 249-266)

Verify:
- ✅ Scopes include: `openid email profile`
- ✅ `GOOGLE_CLIENT_ID` is set in environment
- ✅ `GOOGLE_CLIENT_SECRET` is set in environment

### 4. Google Cloud Console Verification
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Check your OAuth 2.0 Client ID:
   - ✅ **Authorized redirect URIs** includes: `http://localhost:3002/api/auth/callback/google`
   - ✅ **OAuth consent screen** has `email` and `profile` scopes approved
   - ✅ **Test users** (if in testing mode) includes your email

### 5. Common Error Scenarios

#### Error: "Email is required for user creation"
**Cause:** Google OAuth didn't return email
**Fix:** 
- Check Google Cloud Console scopes include `email`
- Check OAuth consent screen is properly configured
- Verify user granted email permission

#### Error: P2002 Unique constraint violation on email
**Cause:** User already exists (race condition or duplicate sign-in)
**Fix:** ✅ **Already handled** - Code now fetches existing user instead of failing

#### Error: P2002 Unique constraint violation on provider
**Cause:** Account already linked
**Fix:** ✅ **Already handled** - Code now fetches existing account instead of failing

#### Error: Missing required fields for account linking
**Cause:** OAuth provider didn't return required account data
**Fix:** Check Google OAuth configuration and scopes

## Testing Steps

1. **Clear existing session:**
   - Sign out if logged in
   - Clear browser cookies/localStorage

2. **Test fresh sign-in:**
   - Click "Login with Google"
   - Grant all permissions
   - Check terminal logs for `[AUTH]` messages
   - Verify no `OAuthCreateAccount` error in URL

3. **Test duplicate sign-in:**
   - Try signing in again with same Google account
   - Should handle gracefully (no error)

4. **Check database:**
   - Verify user was created in `User` table
   - Verify account was linked in `Account` table
   - Check `email`, `name`, `image` fields are populated

## Next Steps if Issue Persists

1. **Check terminal logs** for specific error messages
2. **Verify environment variables:**
   ```bash
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_CLIENT_SECRET
   ```
3. **Test OAuth flow manually:**
   - Visit: `http://localhost:3002/api/auth/signin/google`
   - Check what data is returned
4. **Check Prisma connection:**
   - Verify `DATABASE_URL` is correct
   - Test database connection with `npx prisma db pull`

## Files Modified

- ✅ `lib/auth.ts` - Enhanced error handling in adapter methods
- ✅ Added comprehensive logging throughout OAuth flow
