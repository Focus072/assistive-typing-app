// Suppress deprecation warnings early
import "./suppress-warnings"

import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { PlanTier } from "@prisma/client"
import { google } from "googleapis"
import { logger } from "@/lib/logger"
import { adapter } from "@/lib/auth-adapter"

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
          // - drive.file: Access only to files created by this app (most restrictive)
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.file",
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
      // Enhanced logging for debugging OAuth issues
      logger.log("[AUTH] signIn callback:", {
        hasUser: !!user,
        userEmail: user?.email,
        userName: user?.name,
        userId: user?.id,
        hasAccount: !!account,
        provider: account?.provider,
        hasAccessToken: !!account?.access_token,
        hasRefreshToken: !!account?.refresh_token,
        providerAccountId: account?.providerAccountId,
        profileEmail: profile?.email,
        profileName: profile?.name,
      })

      // Validate that we have required data from Google
      if (!user?.email) {
        logger.error("[AUTH] signIn: Missing email from Google OAuth", { user, profile })
        // Try to get email from profile if not in user object
        if (profile?.email) {
          user.email = profile.email
          logger.log("[AUTH] signIn: Using email from profile", { email: profile.email })
        } else if ((profile as { emails?: { value: string }[] })?.emails?.[0]?.value) {
          // Some OAuth providers nest email in emails array
          user.email = (profile as { emails?: { value: string }[] }).emails![0].value
          logger.log("[AUTH] signIn: Using email from profile.emails array", { email: user.email })
        } else {
          logger.error("[AUTH] signIn: No email found in user or profile objects - rejecting sign-in")
          return false // Reject sign-in if no email
        }
      }

      // Ensure name is set from profile if missing
      if (!user?.name && profile?.name) {
        user.name = profile.name
      }

      // Ensure image is set from profile if missing
      const profileWithPicture = profile as { picture?: string; image?: string }
      if (!user?.image && profileWithPicture?.picture) {
        user.image = profileWithPicture.picture
      } else if (!user?.image && profileWithPicture?.image) {
        user.image = profileWithPicture.image
      }

      // For fallback admin users, allow sign-in even if adapter fails
      if (user?.id === "admin-fallback" || user?.id === "dev-admin-fallback") {
        logger.warn("[AUTH] Allowing fallback admin sign-in (bypassing adapter)")
        return true
      }

      // PrismaAdapter handles user/account creation automatically
      // Always allow sign-in
      try {
        // Always return true - PrismaAdapter handles the rest
        return true
      } catch (error: unknown) {
        // If database is unavailable and it's a fallback user, allow sign-in anyway
        const errMsg = error instanceof Error ? error.message : String(error)
        if ((user?.id === "admin-fallback" || user?.id === "dev-admin-fallback") &&
            (errMsg?.includes("quota") || errMsg?.includes("compute time"))) {
          logger.warn("[AUTH] Allowing fallback admin sign-in despite database error")
          return true
        }

        logger.error("[NextAuth] Error in signIn callback:", error)
        // Always return true to allow sign-in
        return true
      }
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          session.user.id = token.sub as string
          if (token.email) session.user.email = token.email as string
          if (token.name) session.user.name = token.name as string
          if (token.picture) session.user.image = token.picture as string
          if (token.planTier) session.user.planTier = token.planTier as PlanTier
          if (token.subscriptionStatus) session.user.subscriptionStatus = token.subscriptionStatus as string
          session.user.role = (token.role as "ADMIN") ?? null
          session.user.academicIntegrityAcceptedAt = (token.academicIntegrityAcceptedAt as Date) ?? null
        }

        return session
      } catch (error: unknown) {
        logger.error("[AUTH] session callback error:", error)
        return session
      }
    },
    async jwt({ token, user, account, profile }) {
      try {
        // Initial sign in - user is available (created by PrismaAdapter)
        if (user) {
          token.sub = user.id
          token.email = user.email || undefined
          token.name = user.name || undefined
          token.picture = user.image || undefined

          // Fetch planTier and subscriptionStatus from database on initial sign in
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { planTier: true, subscriptionStatus: true, academicIntegrityAcceptedAt: true },
            })

            if (dbUser?.planTier) {
              token.planTier = dbUser.planTier
            }
            if (dbUser?.subscriptionStatus) {
              token.subscriptionStatus = dbUser.subscriptionStatus
            }
            if (dbUser?.academicIntegrityAcceptedAt) {
              token.academicIntegrityAcceptedAt = dbUser.academicIntegrityAcceptedAt
            }
            const emailLower = (token.email ?? "").toLowerCase()
            const adminList = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
            if (adminList.includes(emailLower)) token.role = "ADMIN"
          } catch {
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
              select: { planTier: true, subscriptionStatus: true, academicIntegrityAcceptedAt: true },
            })
            if (dbUser?.planTier) {
              token.planTier = dbUser.planTier
            } else {
              token.planTier = 'FREE'
            }
            if (dbUser?.subscriptionStatus !== undefined) {
              token.subscriptionStatus = dbUser.subscriptionStatus
            }
            if (dbUser?.academicIntegrityAcceptedAt !== undefined) {
              token.academicIntegrityAcceptedAt = dbUser.academicIntegrityAcceptedAt
            }
            const emailLower = (token.email ?? "").toLowerCase()
            const adminList = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
            if (adminList.includes(emailLower)) token.role = "ADMIN"
          } catch {
            // If DB fails, keep existing tier or default to FREE
            if (!token.planTier) {
              token.planTier = 'FREE'
            }
            if (!token.subscriptionStatus) {
              token.subscriptionStatus = null
            }
          }
        }
        // Persist OAuth tokens for refresh
        if (account?.access_token) {
          token.accessToken = account.access_token
        }
        if (account?.refresh_token) {
          token.refreshToken = account.refresh_token
        }
        return token
      } catch (error: unknown) {
        logger.error("[NextAuth] Error in jwt callback:", error)
        // Return token even if there's an error
        return token
      }
    },
    async redirect({ url, baseUrl }) {
      // If callbackUrl is provided (e.g., from deep link checkout), use it
      // Otherwise, redirect to dashboard after successful authentication
      const redirectUrl = url.startsWith(baseUrl) ? url : `${baseUrl}/dashboard`
      return redirectUrl
    },
  },
  pages: {
    signIn: "/", // Redirect to home page instead of separate login page
  },
  events: {
    async signIn({ account, user }) {
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
        } catch (error) {
          logger.error("[NextAuth] Error saving Google token in events (non-blocking):", error)
          // Don't throw - this is non-critical and won't affect OAuth flow
        }
      }
    },
    async createUser() {
    },
    async linkAccount() {
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
