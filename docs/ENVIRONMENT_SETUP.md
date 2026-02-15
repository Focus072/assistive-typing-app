# Environment Setup Guide

## Production Environment Variables

### Quick Setup Checklist

- [ ] Copy `env.template` to `.env.production`
- [ ] Fill in all required values
- [ ] Generate `NEXTAUTH_SECRET`
- [ ] Configure Google OAuth credentials
- [ ] Set up Inngest credentials
- [ ] Configure database connection string

## Detailed Setup

### 1. NextAuth Configuration

```env
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-random-secret>
```

**Generate NEXTAUTH_SECRET**:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Important**: Use different secrets for development and production!

### 2. Database Configuration

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

**Production Database Providers**:
- **Vercel Postgres**: Automatically configured when using Vercel
- **Supabase**: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
- **Railway**: Provided in Railway dashboard
- **Neon**: Provided in Neon dashboard
- **AWS RDS**: `postgresql://[USER]:[PASSWORD]@[ENDPOINT]:5432/[DATABASE]`

**SSL Mode**: Always use `?sslmode=require` in production

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Docs API and Google Drive API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - Production: `https://your-domain.com/api/auth/callback/google`
   - Local (this app): `http://localhost:3002/api/auth/callback/google`

```env
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
```

### 4. Inngest Setup

1. Go to [Inngest Dashboard](https://app.inngest.com/)
2. Create a new app
3. Get your Event Key and Signing Key
4. Configure the sync endpoint URL

```env
INNGEST_EVENT_KEY=<from-inngest-dashboard>
INNGEST_SIGNING_KEY=<from-inngest-dashboard>
INNGEST_BASE_URL=https://your-domain.com/api/inngest
```

**For Local Development**:
```env
INNGEST_BASE_URL=http://localhost:3000/api/inngest
```

### 5. Optional: Base URL for SEO

```env
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

Used for Open Graph tags and absolute URLs.

## Platform-Specific Setup

### Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all environment variables
3. Set environment to "Production", "Preview", and "Development" as needed
4. Redeploy after adding variables

**Vercel Postgres**:
- Automatically creates `DATABASE_URL` environment variable
- No manual configuration needed

### Railway

1. Go to Railway Dashboard → Your Project → Variables
2. Add all environment variables
3. Railway automatically redeploys on variable changes

### Netlify

1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add all environment variables
3. Redeploy after adding variables

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different secrets** for development and production
3. **Rotate secrets** periodically (especially `NEXTAUTH_SECRET`)
4. **Use environment-specific variables** in CI/CD
5. **Restrict database access** to production IPs only
6. **Enable SSL** for all database connections

## Verification

### Test Environment Variables

Create a test script (`scripts/test-env.js`):
```javascript
const required = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'INNGEST_EVENT_KEY',
  'INNGEST_SIGNING_KEY',
]

const missing = required.filter(key => !process.env[key])

if (missing.length > 0) {
  console.error('Missing environment variables:', missing)
  process.exit(1)
}

console.log('All required environment variables are set!')
```

Run: `node scripts/test-env.js`

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` format is correct
- Check SSL mode (`?sslmode=require`)
- Verify database is accessible from deployment platform
- Check firewall rules

### OAuth Issues

- Verify redirect URI matches exactly (including protocol)
- Check client ID and secret are correct
- Verify OAuth consent screen is configured
- Check scopes are enabled in Google Cloud Console

### Inngest Issues

- Verify `INNGEST_BASE_URL` matches your domain
- Check event key and signing key are correct
- Verify Inngest functions are registered
- Check Inngest dashboard for sync status







