# Setup Guide

Follow these steps to set up the Assistive Typing application.

## Step 1: Environment Variables

Create a `.env.local` file in the root directory with the following content:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here-use-openssl-rand-base64-32

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/assistive_typing

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_DOCS_SCOPES=https://www.googleapis.com/auth/documents

# Inngest
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key
INNGEST_BASE_URL=http://localhost:3000/api/inngest
```

### Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

## Step 2: PostgreSQL Database Setup

### Option A: Local PostgreSQL

1. Install PostgreSQL if not already installed:
   - Windows: Download from https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql` (Ubuntu/Debian)

2. Start PostgreSQL service:
   ```bash
   # Windows (as Administrator)
   net start postgresql-x64-14
   
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

3. Create database:
   ```bash
   psql -U postgres
   CREATE DATABASE assistive_typing;
   \q
   ```

4. Update DATABASE_URL in `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/assistive_typing
   ```

### Option B: Cloud Database (Recommended for Production)

- **Supabase**: https://supabase.com (Free tier available)
- **Neon**: https://neon.tech (Free tier available)
- **Railway**: https://railway.app (Free tier available)
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres

Copy the connection string to your `.env.local` file.

## Step 3: Google Cloud Project Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Create a new project or select an existing one

3. Enable Google Docs API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Docs API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - Add your production URL for production
   - Click "Create"
   - Copy the Client ID and Client Secret to `.env.local`

5. Configure OAuth Consent Screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" (unless you have Google Workspace)
   - Fill in required fields:
     - App name: "Assistive Typing"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes:
     - `https://www.googleapis.com/auth/documents`
   - Add test users (for development)
   - Save and continue

## Step 4: Inngest Setup

### Option A: Inngest Cloud (Recommended)

1. Sign up at https://www.inngest.com

2. Create a new app

3. Get your credentials:
   - Event Key: Found in your app settings
   - Signing Key: Found in your app settings

4. Add to `.env.local`:
   ```
   INNGEST_EVENT_KEY=your-event-key
   INNGEST_SIGNING_KEY=your-signing-key
   INNGEST_BASE_URL=https://your-app.inngest.com
   ```

5. Configure webhook endpoint:
   - In Inngest dashboard, set webhook URL to: `https://your-domain.com/api/inngest`
   - For local development, use Inngest Dev Server (see Option B)

### Option B: Local Development with Inngest Dev Server

1. Install Inngest CLI:
   ```bash
   npm install -g inngest-cli
   ```

2. Start Inngest Dev Server:
   ```bash
   npx inngest-cli@latest dev
   ```

3. Update `.env.local`:
   ```
   INNGEST_BASE_URL=http://localhost:8288
   INNGEST_EVENT_KEY=local-dev-key
   INNGEST_SIGNING_KEY=local-dev-signing-key
   ```

## Step 5: Install Dependencies and Setup Database

```bash
# Install dependencies (if not already done)
npm install

# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

## Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check connection string format
- Ensure database exists
- Verify username/password are correct

### Google OAuth Issues

- Verify redirect URI matches exactly
- Check OAuth consent screen is configured
- Ensure Google Docs API is enabled
- Check that scopes are added to consent screen

### Inngest Issues

- Verify Inngest Dev Server is running (if using local)
- Check webhook endpoint is accessible
- Verify credentials are correct
- Check Inngest dashboard for errors

### Prisma Issues

- Run `npx prisma generate` again
- Check database connection string
- Verify Prisma schema is valid: `npx prisma validate`

## Next Steps

1. Register a new account at http://localhost:3000/register
2. Sign in with Google to connect your Google account
3. Create a new typing job
4. Monitor progress in real-time

## Production Deployment

For production deployment:

1. Set up production database (Supabase, Neon, etc.)
2. Configure production Google OAuth credentials
3. Set up Inngest production instance
4. Update all environment variables
5. Deploy to Vercel, Railway, or your preferred platform
6. Set up monitoring and logging
7. Configure backups for database

