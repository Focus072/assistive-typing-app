# Quick Start Guide

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] PostgreSQL database (local or cloud)
- [ ] Google Cloud account
- [ ] Inngest account (or use local dev server)

## 5-Minute Setup

### 1. Create `.env.local` file

Copy the template and fill in your values:

```bash
# On Windows PowerShell
Copy-Item .env.example .env.local

# On Mac/Linux
cp .env.example .env.local
```

Then edit `.env.local` and replace placeholder values.

### 2. Quick Database Setup (Choose One)

**Option A: Local PostgreSQL**
```bash
# Create database
createdb assistive_typing

# Update DATABASE_URL in .env.local
DATABASE_URL=postgresql://yourusername@localhost:5432/assistive_typing
```

**Option B: Free Cloud Database (Easiest)**
1. Go to https://supabase.com
2. Create free account
3. Create new project
4. Copy connection string to `.env.local`

### 3. Google OAuth Setup

1. Go to https://console.cloud.google.com/
2. Create project → Enable "Google Docs API"
3. Create OAuth 2.0 credentials (Web application)
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Secret to `.env.local`

### 4. Inngest Setup (Choose One)

**Option A: Local Dev Server (Easiest for Development)**
```bash
# Install Inngest CLI
npm install -g inngest-cli

# Start dev server (in separate terminal)
npx inngest-cli dev

# Update .env.local
INNGEST_BASE_URL=http://localhost:8288
INNGEST_EVENT_KEY=local-dev
INNGEST_SIGNING_KEY=local-dev
```

**Option B: Inngest Cloud**
1. Sign up at https://www.inngest.com
2. Create app
3. Copy credentials to `.env.local`

### 5. Generate Secret Key

```bash
# Generate NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy output to `NEXTAUTH_SECRET` in `.env.local`

### 6. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 7. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Verify Setup

Run the setup checker:

```bash
node scripts/check-setup.js
```

## Common Issues

### "DATABASE_URL not found"
- Make sure `.env.local` exists
- Check that DATABASE_URL is set correctly
- Verify PostgreSQL is running

### "Google OAuth error"
- Verify redirect URI matches exactly
- Check OAuth consent screen is configured
- Ensure Google Docs API is enabled

### "Inngest connection failed"
- If using local dev server, make sure it's running
- Check INNGEST_BASE_URL is correct
- Verify credentials match

## Need Help?

See [SETUP.md](./SETUP.md) for detailed instructions.

