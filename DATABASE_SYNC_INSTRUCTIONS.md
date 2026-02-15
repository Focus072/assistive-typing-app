# Database Sync Instructions for OAuthCreateAccount Error

## Quick Fix

If you're seeing `OAuthCreateAccount` errors, your database schema might not be synced with your Prisma schema. Follow these steps:

### Option 1: Quick Sync (Development/Testing)

```bash
# Push schema changes directly to database (no migration files)
npx prisma db push

# Regenerate Prisma Client
npx prisma generate
```

**⚠️ Warning**: `db push` is for development. Use migrations for production.

### Option 2: Production Migrations (Recommended)

```bash
# Deploy migrations to production database
npx prisma migrate deploy

# Regenerate Prisma Client
npx prisma generate
```

### Option 3: Verify Database Schema

```bash
# Run verification script to check if tables exist
npm run db:verify
```

This will check:
- ✅ User table exists
- ✅ Account table exists  
- ✅ Session table exists
- ✅ User creation works
- ✅ Required fields are properly configured

## What to Check

### 1. Required NextAuth Tables

Your database must have these tables:
- `User` - Stores user accounts
- `Account` - Links OAuth providers to users
- `Session` - Stores active sessions

### 2. Required Fields

The `User` table must have:
- `id` (String, primary key)
- `email` (String, unique, required)
- `emailVerified` (DateTime, nullable) ✅
- `name` (String, nullable) ✅
- `image` (String, nullable) ✅
- `password` (String, nullable) ✅

All OAuth-related fields are nullable, which is correct.

### 3. Environment Variables

Ensure these are set in production:
```env
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://typingisboring.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Common Issues

### Issue: Tables Don't Exist

**Symptom**: `OAuthCreateAccount` error, database connection works but tables missing

**Fix**:
```bash
npx prisma migrate deploy
# or for dev
npx prisma db push
```

### Issue: Schema Mismatch

**Symptom**: Tables exist but fields are wrong (e.g., `email` not unique, required fields missing)

**Fix**:
```bash
# Check current schema
npm run db:verify

# Sync schema
npx prisma db push
```

### Issue: Prisma Client Out of Date

**Symptom**: Type errors, runtime errors about missing fields

**Fix**:
```bash
npx prisma generate
```

## After Syncing

1. **Test the OAuth flow**:
   - Try logging in with Google
   - Check if user is created in database
   - Verify no `OAuthCreateAccount` error

2. **Check production logs**:
   - Look for `[AUTH]` log messages
   - Check for Prisma error codes (P2002 = unique constraint, etc.)
   - Verify adapter methods are being called

3. **Verify in database**:
   ```bash
   npm run db:studio
   ```
   - Check `User` table for new entries
   - Check `Account` table for OAuth links

## Still Having Issues?

If the error persists after syncing:

1. **Check production logs** - The instrumentation we added will show exactly where it's failing
2. **Verify DATABASE_URL** - Ensure it points to the correct database
3. **Check database permissions** - User must have CREATE, INSERT, UPDATE permissions
4. **Review error details** - Look for specific Prisma error codes in logs

## Next Steps

Once database is synced, reproduce the OAuth login and share the log file contents from `.cursor/debug.log` so we can analyze the exact error.
