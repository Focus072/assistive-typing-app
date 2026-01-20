# Admin Dashboard Setup

## Initial Setup

To set up an admin account with username and password:

### Step 1: Add Admin Email to Environment

Add your admin email to `.env.local`:

```bash
ADMIN_EMAILS=your-admin-email@example.com
```

### Step 2: Create Admin Account with Password

You can set up your admin account in two ways:

#### Option A: Using the Setup API (Recommended)

Make a POST request to create/set password for admin:

```bash
curl -X POST http://localhost:3002/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "galaljobah",
    "password": "your-secure-password"
  }'
```

Or using PowerShell:

```powershell
$body = @{username='galaljobah'; password='your-secure-password'} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3002/api/admin/setup" -Method POST -ContentType "application/json" -Body $body
```

#### Option B: Using Prisma Studio

1. Run `npm run db:studio`
2. Navigate to the `User` table
3. Find or create a user with your admin email
4. Set the `password` field to a bcrypt hash (you'll need to hash it first)

## Accessing Admin Dashboard

1. Go to: `http://localhost:3002/admin/login`
2. Enter your username (e.g., `galaljobah`) and password
3. You'll be redirected to the admin dashboard at `/admin`

**Note:** The username will be automatically converted to an email (e.g., `galaljobah` → `galaljobah@gmail.com`)

## Security Notes

- Only emails listed in `ADMIN_EMAILS` environment variable can access the admin dashboard
- Admin accounts use password authentication (not Google OAuth)
- Passwords are hashed using bcrypt
- Admin login is separate from regular user login
