// Suppress deprecation warnings early
import "./suppress-warnings"

import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { PlanTier } from "@prisma/client"
import { google } from "googleapis"

// Wrap PrismaAdapter to catch errors and handle fallback users
const baseAdapter = PrismaAdapter(prisma)

// Create a wrapper adapter that handles fallback users gracefully
const adapter = {
  ...baseAdapter,
  async createUser(user: any) {
    // For fallback users, skip database creation
    if (user.id === "admin-fallback" || user.id === "dev-admin-fallback") {
      console.warn("[AUTH] Skipping database user creation for fallback admin")
      return user
    }
    try {
      return await baseAdapter.createUser!(user)
    } catch (error: any) {
      // If database fails and it's a fallback user, return the user anyway
      if (user.id === "admin-fallback" || user.id === "dev-admin-fallback") {
        console.warn("[AUTH] Database unavailable, skipping user creation for fallback")
        return user
      }
      throw error
    }
  },
  async linkAccount(account: any) {
    // For fallback users, skip account linking
    if (account.userId === "admin-fallback" || account.userId === "dev-admin-fallback") {
      console.warn("[AUTH] Skipping account linking for fallback admin")
      return account
    }
    try {
      return await baseAdapter.linkAccount!(account)
    } catch (error: any) {
      // If database fails, log but don't block
      console.warn("[AUTH] Account linking failed (non-blocking):", error?.message)
      return account
    }
  },
  async createSession(session: any) {
    // For fallback users, skip session creation (JWT handles it)
    if (session.userId === "admin-fallback" || session.userId === "dev-admin-fallback") {
      return session
    }
    try {
      return await baseAdapter.createSession!(session)
    } catch (error: any) {
      // If database fails, return session anyway (JWT will handle it)
      console.warn("[AUTH] Session creation failed (non-blocking):", error?.message)
      return session
    }
  },
  async getUser(id: string) {
    // For fallback users, return null (JWT will handle it)
    if (id === "admin-fallback" || id === "dev-admin-fallback") {
      return null
    }
    try {
      return await baseAdapter.getUser!(id)
    } catch (error: any) {
      // If database fails, return null (JWT will handle it)
      console.warn("[AUTH] Get user failed (non-blocking):", error?.message)
      return null
    }
  },
  async getUserByEmail(email: string) {
    try {
      return await baseAdapter.getUserByEmail!(email)
    } catch (error: any) {
      // If database fails, return null
      console.warn("[AUTH] Get user by email failed (non-blocking):", error?.message)
      return null
    }
  },
  async getUserByAccount(account: any) {
    try {
      return await baseAdapter.getUserByAccount!(account)
    } catch (error: any) {
      // If database fails, return null
      console.warn("[AUTH] Get user by account failed (non-blocking):", error?.message)
      return null
    }
  },
  async updateUser(user: any) {
    // For fallback users, skip database update
    if (user.id === "admin-fallback" || user.id === "dev-admin-fallback") {
      return user
    }
    try {
      return await baseAdapter.updateUser!(user)
    } catch (error: any) {
      // If database fails, return user anyway
      console.warn("[AUTH] Update user failed (non-blocking):", error?.message)
      return user
    }
  },
  async deleteSession(sessionToken: string): Promise<void> {
    try {
      await baseAdapter.deleteSession!(sessionToken)
    } catch (error: any) {
      // If database fails, log but don't throw (non-blocking)
      console.warn("[AUTH] Delete session failed (non-blocking):", error?.message)
      // Return void (don't throw error)
    }
  },
  async updateSession(session: any) {
    try {
      return await baseAdapter.updateSession!(session)
    } catch (error: any) {
      // If database fails, return session anyway
      console.warn("[AUTH] Update session failed (non-blocking):", error?.message)
      return session
    }
  },
  async createVerificationToken(verificationToken: any) {
    try {
      return await baseAdapter.createVerificationToken!(verificationToken)
    } catch (error: any) {
      // If database fails, return token anyway
      console.warn("[AUTH] Create verification token failed (non-blocking):", error?.message)
      return verificationToken
    }
  },
  async useVerificationToken(token: any) {
    try {
      return await baseAdapter.useVerificationToken!(token)
    } catch (error: any) {
      // If database fails, return null
      console.warn("[AUTH] Use verification token failed (non-blocking):", error?.message)
      return null
    }
  },
}

export const authOptions: NextAuthOptions = {
  // Use PrismaAdapter - it handles Account/Session creation automatically
  // We'll supplement it with manual token saving in events.signIn
  adapter,
  providers: [
    // Google OAuth is the only authentication method
    // We require Google API permissions to automate typing in Google Docs
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Minimal scopes required for typing into Google Docs:
          // - openid, email, profile: Standard OAuth user info
          // - documents: Read/write access to Google Docs
          // - drive.file: Access only to files created by this app (most restrictive)
          scope:
            "openid email profile https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file",
          access_type: "offline", // Required to get refresh token
          prompt: "consent", // Always show consent screen to ensure refresh token
        },
      },
      // Allow account linking for same email across providers
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:61',message:'signIn callback entry',data:{hasUser:!!user,userEmail:user?.email,userId:user?.id,hasAccount:!!account,provider:account?.provider,hasAccessToken:!!account?.access_token,hasRefreshToken:!!account?.refresh_token,providerAccountId:account?.providerAccountId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // For fallback admin users, allow sign-in even if adapter fails
      if (user?.id === "admin-fallback" || user?.id === "dev-admin-fallback") {
        console.warn("[AUTH] Allowing fallback admin sign-in (bypassing adapter)")
        return true
      }
      
      // PrismaAdapter handles user/account creation automatically
      // Always allow sign-in
      try {
        // Always return true - PrismaAdapter handles the rest
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:75',message:'signIn callback returning true',data:{userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return true
      } catch (error: any) {
        // If database is unavailable and it's a fallback user, allow sign-in anyway
        if ((user?.id === "admin-fallback" || user?.id === "dev-admin-fallback") &&
            (error?.message?.includes("quota") || error?.message?.includes("compute time"))) {
          console.warn("[AUTH] Allowing fallback admin sign-in despite database error")
          return true
        }
        
        if (process.env.NODE_ENV === "development") {
          console.error("[NextAuth] Error in signIn callback:", error)
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:78',message:'signIn callback error caught',data:{errorMessage:error?.message,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Always return true to allow sign-in
        return true
      }
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        if (token.email) session.user.email = token.email as string
        if (token.name) session.user.name = token.name as string
        if (token.picture) session.user.image = token.picture as string
        if (token.planTier) session.user.planTier = token.planTier as PlanTier
        if (token.subscriptionStatus) session.user.subscriptionStatus = token.subscriptionStatus as string
      }
      return session
    },
    async jwt({ token, user, account, profile }) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:91',message:'jwt callback entry',data:{hasUser:!!user,userId:user?.id,userEmail:user?.email,hasAccount:!!account,provider:account?.provider,tokenSub:token.sub},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      try {
        // Initial sign in - user is available (created by PrismaAdapter)
        if (user) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:95',message:'jwt callback setting token.sub',data:{userId:user.id,userEmail:user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          token.sub = user.id
          token.email = user.email || undefined
          token.name = user.name || undefined
          token.picture = user.image || undefined
          
          // Fetch planTier and subscriptionStatus from database on initial sign in
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { planTier: true, subscriptionStatus: true },
            })
            if (dbUser?.planTier) {
              token.planTier = dbUser.planTier
            }
            if (dbUser?.subscriptionStatus) {
              token.subscriptionStatus = dbUser.subscriptionStatus
            }
          } catch (dbError) {
            // If DB fails, default to FREE
            token.planTier = 'FREE'
            token.subscriptionStatus = null
          }
        } else if (token.sub) {
          // On subsequent requests, refresh planTier and subscriptionStatus from database
          // This ensures tier updates (from webhooks) are reflected
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: { planTier: true, subscriptionStatus: true },
            })
            if (dbUser?.planTier) {
              token.planTier = dbUser.planTier
            } else {
              token.planTier = 'FREE'
            }
            if (dbUser?.subscriptionStatus !== undefined) {
              token.subscriptionStatus = dbUser.subscriptionStatus
            }
          } catch (dbError) {
            // If DB fails, keep existing tier or default to FREE
            if (!token.planTier) {
              token.planTier = 'FREE'
            }
            if (!token.subscriptionStatus) {
              token.subscriptionStatus = null
            }
          }
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:109',message:'jwt callback no user object',data:{tokenSub:token.sub},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        }
        // Persist OAuth tokens for refresh
        if (account?.access_token) {
          token.accessToken = account.access_token
        }
        if (account?.refresh_token) {
          token.refreshToken = account.refresh_token
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:111',message:'jwt callback returning token',data:{tokenSub:token.sub,tokenEmail:token.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return token
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (process.env.NODE_ENV === "development") {
          console.error("[NextAuth] Error in jwt callback:", error)
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:114',message:'jwt callback error caught',data:{errorMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Return token even if there's an error
        return token
      }
    },
    async redirect({ url, baseUrl }) {
      // If callbackUrl is provided (e.g., from deep link checkout), use it
      // Otherwise, redirect to dashboard after successful authentication
      if (url.startsWith(baseUrl)) {
        return url
      }
      // Fallback to dashboard if no valid callback URL
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: "/", // Redirect to home page instead of separate login page
  },
  events: {
    async signIn({ account, profile, user }) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:236',message:'events.signIn callback entry',data:{hasUser:!!user,userId:user?.id,userEmail:user?.email,hasAccount:!!account,provider:account?.provider,hasAccessToken:!!account?.access_token,hasRefreshToken:!!account?.refresh_token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      if (account?.provider === "google" && account?.access_token && account?.refresh_token && user?.id) {
        try {
          const expiresAt = account.expires_at
            ? new Date(account.expires_at * 1000)
            : new Date(Date.now() + 3600 * 1000)

          // Save token - if this fails, log but don't throw
          await prisma.googleToken.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiresAt,
            },
            update: {
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiresAt,
            },
          })
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:257',message:'events.signIn token saved successfully',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (process.env.NODE_ENV === "development") {
            console.error("[NextAuth] Error saving Google token in events (non-blocking):", error)
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:261',message:'events.signIn token save error',data:{errorMessage,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          // Don't throw - this is non-critical and won't affect OAuth flow
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:290',message:'events.signIn conditions not met',data:{hasUser:!!user,hasAccount:!!account,provider:account?.provider,hasAccessToken:!!account?.access_token,hasRefreshToken:!!account?.refresh_token,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
      }
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days - persistent sessions
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
}

export async function getGoogleAuthClient(userId: string) {
  const token = await prisma.googleToken.findUnique({
    where: { userId },
  })

  if (!token) {
    throw new Error("Google OAuth token not found")
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  )

  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
  })

  // Refresh token if expired
  if (token.expiresAt < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    await prisma.googleToken.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || token.refreshToken,
        expiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
      },
    })

    oauth2Client.setCredentials(credentials)
  }

  return oauth2Client
}


