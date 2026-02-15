# Google login for local development

Login works locally only if **two things** are set: your app’s base URL and Google’s allowed redirect URI.

## 1. Set local URL in `.env.local`

NextAuth uses `NEXTAUTH_URL` for redirects. For **local** dev it must match your dev server:

```env
# Use this when running locally (npm run dev uses port 3002)
NEXTAUTH_URL=http://localhost:3002
```

- **Local:** `NEXTAUTH_URL=http://localhost:3002` in `.env.local`
- **Production:** Vercel uses its own env (e.g. `https://typingisboring.com`). Your local `.env.local` does not affect production.

So you can keep `NEXTAUTH_URL=http://localhost:3002` in `.env.local` and use it for all local work; production stays correct via Vercel env.

## 2. Add local redirect URI in Google Cloud Console

Google only redirects to URIs you list for your OAuth client.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → your project.
2. **APIs & Services** → **Credentials** → open your **OAuth 2.0 Client ID** (Web client).
3. Under **Authorized redirect URIs**, add:
   - `http://localhost:3002/api/auth/callback/google`
4. Optional: also add `http://127.0.0.1:3002/api/auth/callback/google` if you use that host.
5. **Save**.

## 3. Restart and test

1. Restart the dev server: `npm run dev`.
2. Open `http://localhost:3002`.
3. Click **Login with Google**. You should be sent to Google, then back to `http://localhost:3002` and be logged in.

## If it still fails

- Confirm **Authorized redirect URIs** includes exactly  
  `http://localhost:3002/api/auth/callback/google` (no trailing slash, correct port).
- Confirm `.env.local` has `NEXTAUTH_URL=http://localhost:3002` and no typo.
- Clear cookies for `localhost` and try again.
- Check the terminal running `npm run dev` for NextAuth/redirect errors.
