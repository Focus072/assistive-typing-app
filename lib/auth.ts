// Suppress deprecation warnings early
import "./suppress-warnings"

import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { PlanTier } from "@prisma/client"
import { google } from "googleapis"
import type { AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters"

// Wrap PrismaAdapter to catch errors and handle fallback users
const baseAdapter = PrismaAdapter(prisma)

// Create a wrapper adapter that handles fallback users gracefully
const adapter = {
  ...baseAdapter,
  async createUser(user: AdapterUser) {
    // For fallback users, skip database creation
    if (user.id === "admin-fallback" || user.id === "dev-admin-fallback") {
      console.warn("[AUTH] Skipping database user creation for fallback admin")
      return user
    }

    // Validate required fields
    if (!user.email) {
      console.error("[AUTH] createUser: Missing email field", { user })
      throw new Error("Email is required for user creation")
    }

    try {
      // Check if user already exists (might happen with concurrent requests)
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      })

      if (existingUser) {
        console.log("[AUTH] User already exists, returning existing user", { email: user.email })
        return existingUser
      }

      // Ensure all required fields are present with defaults
      const userData = {
        email: user.email,
        name: user.name || null,
        image: user.image || null,
        emailVerified: user.emailVerified || null,
      }

      const createdUser = await baseAdapter.createUser!(userData)

      return createdUser
    } catch (error: unknown) {
      // Handle duplicate email error (P2002 is Prisma unique constraint violation)
      const prismaError = error as { code?: string; meta?: { target?: string[] }; message?: string; stack?: string }
      if (prismaError?.code === 'P2002' && prismaError?.meta?.target?.includes('email')) {
        console.log("[AUTH] User with email already exists, fetching existing user", { email: user.email })
        // User already exists, fetch and return it
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (existingUser) {
          return existingUser
        }
      }

      // If database fails and it's a fallback user, return the user anyway
      if (user.id === "admin-fallback" || user.id === "dev-admin-fallback") {
        console.warn("[AUTH] Database unavailable, skipping user creation for fallback")
        return user
      }

      // Log detailed error for debugging
      console.error("[AUTH] createUser error:", {
        code: prismaError?.code,
        message: prismaError?.message,
        meta: prismaError?.meta,
        userEmail: user.email,
        stack: prismaError?.stack,
      })

      throw error
    }
  },
  async linkAccount(account: AdapterAccount) {
    // For fallback users, skip account linking
    if (account.userId === "admin-fallback" || account.userId === "dev-admin-fallback") {
      console.warn("[AUTH] Skipping account linking for fallback admin")
      return account
    }

    // Validate required fields
    if (!account.userId || !account.provider || !account.providerAccountId) {
      console.error("[AUTH] linkAccount: Missing required fields", {
        hasUserId: !!account.userId,
        hasProvider: !!account.provider,
        hasProviderAccountId: !!account.providerAccountId,
      })
      throw new Error("Missing required fields for account linking")
    }

    try {
      // Check if account already exists
      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
      })

      if (existingAccount) {
        console.log("[AUTH] Account already linked, returning existing account")
        return existingAccount
      }

      const linkedAccount = await baseAdapter.linkAccount!(account)

      return linkedAccount
    } catch (error: unknown) {
      // Handle duplicate account error (P2002 is Prisma unique constraint violation)
      const prismaError = error as { code?: string; meta?: { target?: string[] }; message?: string }
      if (prismaError?.code === 'P2002' && prismaError?.meta?.target?.includes('provider')) {
        console.log("[AUTH] Account already linked, fetching existing account")
        // Account already exists, fetch and return it
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        })
        if (existingAccount) {
          return existingAccount
        }
      }

      // Log detailed error for debugging
      console.error("[AUTH] linkAccount error:", {
        code: prismaError?.code,
        message: prismaError?.message,
        meta: prismaError?.meta,
        provider: account.provider,
        userId: account.userId,
      })

      // If database fails, log but don't block (non-critical)
      console.warn("[AUTH] Account linking failed (non-blocking):", prismaError?.message)
      return account
    }
  },
  async createSession(session: AdapterSession) {
    // For fallback users, skip session creation (JWT handles it)
    if (session.userId === "admin-fallback" || session.userId === "dev-admin-fallback") {
      return session
    }
    try {
      return await baseAdapter.createSession!(session)
    } catch (error: unknown) {
      // If database fails, return session anyway (JWT will handle it)
      console.warn("[AUTH] Session creation failed (non-blocking):", error instanceof Error ? error.message : String(error))
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
    } catch (error: unknown) {
      // If database fails, return null (JWT will handle it)
      console.warn("[AUTH] Get user failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return null
    }
  },
  async getUserByEmail(email: string) {
    try {
      return await baseAdapter.getUserByEmail!(email)
    } catch (error: unknown) {
      // If database fails, return null
      console.warn("[AUTH] Get user by email failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return null
    }
  },
  async getUserByAccount(account: Pick<AdapterAccount, "provider" | "providerAccountId">) {
    try {
      return await baseAdapter.getUserByAccount!(account)
    } catch (error: unknown) {
      // If database fails, return null
      console.warn("[AUTH] Get user by account failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return null
    }
  },
  async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
    // For fallback users, skip database update
    if (user.id === "admin-fallback" || user.id === "dev-admin-fallback") {
      return user as AdapterUser
    }
    try {
      return await baseAdapter.updateUser!(user)
    } catch (error: unknown) {
      // If database fails, return user anyway
      console.warn("[AUTH] Update user failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return user as AdapterUser
    }
  },
  async deleteSession(sessionToken: string): Promise<void> {
    try {
      await baseAdapter.deleteSession!(sessionToken)
    } catch (error: unknown) {
      // If database fails, log but don't throw (non-blocking)
      console.warn("[AUTH] Delete session failed (non-blocking):", error instanceof Error ? error.message : String(error))
      // Return void (don't throw error)
    }
  },
  async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">) {
    try {
      return await baseAdapter.updateSession!(session)
    } catch (error: unknown) {
      // If database fails, return session anyway
      console.warn("[AUTH] Update session failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return session as AdapterSession
    }
  },
  async createVerificationToken(verificationToken: VerificationToken) {
    try {
      return await baseAdapter.createVerificationToken!(verificationToken)
    } catch (error: unknown) {
      // If database fails, return token anyway
      console.warn("[AUTH] Create verification token failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return verificationToken
    }
  },
  async useVerificationToken(token: { identifier: string; token: string }) {
    try {
      return await baseAdapter.useVerificationToken!(token)
    } catch (error: unknown) {
      // If database fails, return null
      console.warn("[AUTH] Use verification token failed (non-blocking):", error instanceof Error ? error.message : String(error))
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
      console.log("[AUTH] signIn callback:", {
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
        console.error("[AUTH] signIn: Missing email from Google OAuth", { user, profile })
        // Try to get email from profile if not in user object
        if (profile?.email) {
          user.email = profile.email
          console.log("[AUTH] signIn: Using email from profile", { email: profile.email })
        } else if ((profile as { emails?: { value: string }[] })?.emails?.[0]?.value) {
          // Some OAuth providers nest email in emails array
          user.email = (profile as { emails?: { value: string }[] }).emails![0].value
          console.log("[AUTH] signIn: Using email from profile.emails array", { email: user.email })
        } else {
          console.error("[AUTH] signIn: No email found in user or profile objects - rejecting sign-in")
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
        console.warn("[AUTH] Allowing fallback admin sign-in (bypassing adapter)")
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
          console.warn("[AUTH] Allowing fallback admin sign-in despite database error")
          return true
        }

        if (process.env.NODE_ENV === "development") {
          console.error("[NextAuth] Error in signIn callback:", error)
        }
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
        console.error("[AUTH] session callback error:", error)
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
          } catch (dbError) {
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
        if (process.env.NODE_ENV === "development") {
          console.error("[NextAuth] Error in jwt callback:", error)
        }
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
    async signIn({ account, profile, user }) {
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
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (process.env.NODE_ENV === "development") {
            console.error("[NextAuth] Error saving Google token in events (non-blocking):", error)
          }
          // Don't throw - this is non-critical and won't affect OAuth flow
        }
      }
    },
    async createUser({ user }) {
    },
    async linkAccount({ account, user }) {
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
