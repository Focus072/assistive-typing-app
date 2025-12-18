# Google OAuth Setup & Testing Guide

## OAuth Scopes

The application requests minimal scopes required for functionality:

- `openid` - Standard OAuth identifier
- `email` - User email address
- `profile` - Basic user profile information
- `https://www.googleapis.com/auth/documents` - Read/write access to Google Docs
- `https://www.googleapis.com/auth/drive.file` - Access only to files created by this app (most restrictive)

**Note:** `drive.file` is the most restrictive scope - it only allows access to files created by the app. This is intentional for security.

## Production Configuration

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable APIs:
   - Google Docs API
   - Google Drive API (for file creation)
4. Create OAuth 2.0 Credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://your-domain.com/api/auth/callback/google`
5. Configure OAuth Consent Screen:
   - Add scopes listed above
   - Set user support email
   - Add test users (for development)

### 2. Environment Variables

Set in production `.env`:

```env
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-random-secret-key
```

## OAuth Flow Testing Checklist

### ✅ First-time Sign-up
- [ ] User clicks "Start typing in Google Docs" or "Login"
- [ ] Redirected to Google OAuth consent screen
- [ ] User grants permissions
- [ ] Redirected back to `/dashboard`
- [ ] User account created in database
- [ ] Google tokens saved successfully

### ✅ Returning Login
- [ ] User clicks "Start typing in Google Docs" or "Login"
- [ ] If session valid, redirected directly to `/dashboard`
- [ ] If session expired, goes through OAuth flow
- [ ] Tokens refreshed if needed

### ✅ Cancelled Consent
- [ ] User clicks "Start typing in Google Docs" or "Login"
- [ ] User cancels or closes consent screen
- [ ] Redirected to `/auth/error?error=OAuthCallback`
- [ ] Error page displays helpful message
- [ ] User can retry sign-in

### ✅ Revoked Consent
- [ ] User revokes access in Google Account settings
- [ ] Next API call fails with auth error
- [ ] User redirected to login
- [ ] User can re-authorize

### ✅ Error States
- [ ] Invalid client ID/secret → Error page shown
- [ ] Network error during OAuth → Error page shown
- [ ] Database error during sign-in → Error logged, user can retry

## Redirect Behavior

### Unauthenticated Users
- `/dashboard` → Redirects to `/login`
- `/dashboard/history` → Redirects to `/login`
- `/dashboard/analytics` → Redirects to `/login`
- `/dashboard/settings` → Redirects to `/login`

### Authenticated Users
- `/` (landing page) → Redirects to `/dashboard`
- `/login` → Redirects to `/dashboard` (if already authenticated)

### OAuth Callback
- Successful auth → Always redirects to `/dashboard` (configured in `lib/auth.ts`)
- Failed auth → Redirects to `/auth/error` with error parameter

## Button Verification

Both buttons trigger the same OAuth flow:

1. **Landing page**: "Start typing in Google Docs" button
   - Location: `components/ui/sign-in-flow-1.tsx`
   - Calls: `signIn("google", { callbackUrl: "/dashboard" })`

2. **Navbar**: "Login" button
   - Location: `components/ui/sign-in-flow-1.tsx`
   - Calls: `signIn("google", { callbackUrl: "/dashboard" })`

3. **Login page**: "Sign in with Google" button
   - Location: `app/(auth)/login/page.tsx`
   - Calls: `signIn("google", { callbackUrl: "/dashboard" })`

All three buttons correctly initiate Google OAuth with the same callback URL.

## Error Handling

### Error Page
- Location: `app/auth/error/page.tsx`
- Handles: OAuthCallback, AccessDenied, and generic errors
- Provides: Clear error message, common causes, retry button
- Matches: App's dark aesthetic

### Login Page Error Handling
- Displays OAuth errors from URL parameters
- Shows loading state during OAuth redirect
- Provides retry functionality

## Token Management

- Access tokens stored in `GoogleToken` table
- Refresh tokens stored securely
- Tokens automatically refreshed when expired
- Token refresh handled in `getGoogleAuthClient()` function

## Security Notes

- `prompt: "consent"` ensures refresh token is always obtained
- `access_type: "offline"` required for refresh tokens
- `drive.file` scope is most restrictive (only app-created files)
- Tokens stored securely in database
- No tokens exposed in client-side code







