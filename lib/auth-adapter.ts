import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import type { AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters"
import { logger } from "@/lib/logger"

// Wrap PrismaAdapter to catch errors and handle fallback users
const baseAdapter = PrismaAdapter(prisma)

// Create a wrapper adapter that handles fallback users gracefully
export const adapter = {
  ...baseAdapter,
  async createUser(user: AdapterUser) {
    // For fallback users, skip database creation
    if (user.id === "admin-fallback" || user.id === "dev-admin-fallback") {
      logger.warn("[AUTH] Skipping database user creation for fallback admin")
      return user
    }

    // Validate required fields
    if (!user.email) {
      logger.error("[AUTH] createUser: Missing email field", { user })
      throw new Error("Email is required for user creation")
    }

    try {
      // Check if user already exists (might happen with concurrent requests)
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      })

      if (existingUser) {
        logger.log("[AUTH] User already exists, returning existing user", { email: user.email })
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
        logger.log("[AUTH] User with email already exists, fetching existing user", { email: user.email })
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
        logger.warn("[AUTH] Database unavailable, skipping user creation for fallback")
        return user
      }

      // Log detailed error for debugging
      logger.error("[AUTH] createUser error:", {
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
      logger.warn("[AUTH] Skipping account linking for fallback admin")
      return account
    }

    // Validate required fields
    if (!account.userId || !account.provider || !account.providerAccountId) {
      logger.error("[AUTH] linkAccount: Missing required fields", {
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
        logger.log("[AUTH] Account already linked, returning existing account")
        return existingAccount
      }

      const linkedAccount = await baseAdapter.linkAccount!(account)

      return linkedAccount
    } catch (error: unknown) {
      // Handle duplicate account error (P2002 is Prisma unique constraint violation)
      const prismaError = error as { code?: string; meta?: { target?: string[] }; message?: string }
      if (prismaError?.code === 'P2002' && prismaError?.meta?.target?.includes('provider')) {
        logger.log("[AUTH] Account already linked, fetching existing account")
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
      logger.error("[AUTH] linkAccount error:", {
        code: prismaError?.code,
        message: prismaError?.message,
        meta: prismaError?.meta,
        provider: account.provider,
        userId: account.userId,
      })

      // If database fails, log but don't block (non-critical)
      logger.warn("[AUTH] Account linking failed (non-blocking):", prismaError?.message)
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
      logger.warn("[AUTH] Session creation failed (non-blocking):", error instanceof Error ? error.message : String(error))
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
      logger.warn("[AUTH] Get user failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return null
    }
  },
  async getUserByEmail(email: string) {
    try {
      return await baseAdapter.getUserByEmail!(email)
    } catch (error: unknown) {
      // If database fails, return null
      logger.warn("[AUTH] Get user by email failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return null
    }
  },
  async getUserByAccount(account: Pick<AdapterAccount, "provider" | "providerAccountId">) {
    try {
      return await baseAdapter.getUserByAccount!(account)
    } catch (error: unknown) {
      // If database fails, return null
      logger.warn("[AUTH] Get user by account failed (non-blocking):", error instanceof Error ? error.message : String(error))
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
      logger.warn("[AUTH] Update user failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return user as AdapterUser
    }
  },
  async deleteSession(sessionToken: string): Promise<void> {
    try {
      await baseAdapter.deleteSession!(sessionToken)
    } catch (error: unknown) {
      // If database fails, log but don't throw (non-blocking)
      logger.warn("[AUTH] Delete session failed (non-blocking):", error instanceof Error ? error.message : String(error))
      // Return void (don't throw error)
    }
  },
  async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">) {
    try {
      return await baseAdapter.updateSession!(session)
    } catch (error: unknown) {
      // If database fails, return session anyway
      logger.warn("[AUTH] Update session failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return session as AdapterSession
    }
  },
  async createVerificationToken(verificationToken: VerificationToken) {
    try {
      return await baseAdapter.createVerificationToken!(verificationToken)
    } catch (error: unknown) {
      // If database fails, return token anyway
      logger.warn("[AUTH] Create verification token failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return verificationToken
    }
  },
  async useVerificationToken(token: { identifier: string; token: string }) {
    try {
      return await baseAdapter.useVerificationToken!(token)
    } catch (error: unknown) {
      // If database fails, return null
      logger.warn("[AUTH] Use verification token failed (non-blocking):", error instanceof Error ? error.message : String(error))
      return null
    }
  },
}
