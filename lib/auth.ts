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

// #region agent log
// Log adapter initialization (server-side only)
if (typeof window === 'undefined') {
  fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:12',message:'Adapter: Initialized',data:{hasPrisma:!!prisma},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
}
// #endregion

// Create a wrapper adapter that handles fallback users gracefully
const adapter = {
  ...baseAdapter,
  async createUser(user: any) {
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
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:42',message:'createUser: Attempting user creation',data:{email:userData.email,hasName:!!userData.name,hasImage:!!userData.image,hasEmailVerified:!!userData.emailVerified},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const createdUser = await baseAdapter.createUser!(userData)
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:50',message:'createUser: User created successfully',data:{userId:createdUser?.id,email:createdUser?.email},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      return createdUser
    } catch (error: any) {
      // Handle duplicate email error (P2002 is Prisma unique constraint violation)
      if (error?.code === 'P2002' && error?.meta?.target?.includes('email')) {
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
        code: error?.code,
        message: error?.message,
        meta: error?.meta,
        userEmail: user.email,
        stack: error?.stack,
      })
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:70',message:'createUser: Error thrown',data:{errorCode:error?.code,errorMessage:error?.message,prismaMeta:error?.meta,userEmail:user.email},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      throw error
    }
  },
  async linkAccount(account: any) {
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
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:120',message:'linkAccount: Attempting account linking',data:{userId:account.userId,provider:account.provider,providerAccountId:account.providerAccountId},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      const linkedAccount = await baseAdapter.linkAccount!(account)
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:125',message:'linkAccount: Account linked successfully',data:{accountId:linkedAccount?.id,userId:linkedAccount?.userId},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      return linkedAccount
    } catch (error: any) {
      // Handle duplicate account error (P2002 is Prisma unique constraint violation)
      if (error?.code === 'P2002' && error?.meta?.target?.includes('provider')) {
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
        code: error?.code,
        message: error?.message,
        meta: error?.meta,
        provider: account.provider,
        userId: account.userId,
      })
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:145',message:'linkAccount: Error caught (non-blocking)',data:{errorCode:error?.code,errorMessage:error?.message,prismaMeta:error?.meta,provider:account.provider,userId:account.userId},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // If database fails, log but don't block (non-critical)
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

// #region agent log
// Log environment variable presence at module load (server-side only)
if (typeof window === 'undefined') {
  fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:270',message:'authOptions: Environment check',data:{hasGoogleClientId:!!process.env.GOOGLE_CLIENT_ID,hasGoogleClientSecret:!!process.env.GOOGLE_CLIENT_SECRET,hasNextAuthSecret:!!process.env.NEXTAUTH_SECRET,hasNextAuthUrl:!!process.env.NEXTAUTH_URL,nextAuthUrl:process.env.NEXTAUTH_URL},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
}
// #endregion

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
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:313',message:'signIn callback: Entry',data:{hasUser:!!user,userEmail:user?.email,userId:user?.id,hasAccount:!!account,provider:account?.provider,hasAccessToken:!!account?.access_token,hasRefreshToken:!!account?.refresh_token,profileEmail:profile?.email},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Validate that we have required data from Google
      if (!user?.email) {
        console.error("[AUTH] signIn: Missing email from Google OAuth", { user, profile })
        // Try to get email from profile if not in user object
        if (profile?.email) {
          user.email = profile.email
          console.log("[AUTH] signIn: Using email from profile", { email: profile.email })
        } else if ((profile as any)?.emails?.[0]?.value) {
          // Some OAuth providers nest email in emails array
          user.email = (profile as any).emails[0].value
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
      const profileAny = profile as any
      if (!user?.image && profileAny?.picture) {
        user.image = profileAny.picture
      } else if (!user?.image && profileAny?.image) {
        user.image = profileAny.image
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
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:315',message:'signIn callback: Returning true',data:{userId:user?.id,userEmail:user?.email},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
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
        fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:330',message:'signIn callback: Error caught, returning true anyway',data:{errorMessage:error?.message,errorCode:error?.code,errorStack:error?.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        // Always return true to allow sign-in
        return true
      }
    },
    async session({ session, token }) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:382',message:'session callback: Entry',data:{hasSession:!!session,hasUser:!!session?.user,hasToken:!!token,tokenSub:token?.sub,tokenEmail:token?.email},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
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
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:394',message:'session callback: Success',data:{userId:session.user?.id,userEmail:session.user?.email,hasPlanTier:!!session.user?.planTier},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        return session
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:400',message:'session callback: Error',data:{errorMessage:error?.message,errorCode:error?.code},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        console.error("[AUTH] session callback error:", error)
        return session
      }
    },
    async jwt({ token, user, account, profile }) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:393',message:'jwt callback: Entry',data:{hasUser:!!user,userId:user?.id,userEmail:user?.email,hasAccount:!!account,provider:account?.provider,tokenSub:token.sub,hasProfile:!!profile},timestamp:Date.now(),runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      try {
        // Initial sign in - user is available (created by PrismaAdapter)
        if (user) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:403',message:'jwt callback: Initial sign-in, setting user data',data:{userId:user.id,userEmail:user.email,hasName:!!user.name,hasImage:!!user.image},timestamp:Date.now(),runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
          token.sub = user.id
          token.email = user.email || undefined
          token.name = user.name || undefined
          token.picture = user.image || undefined
          
          // Fetch planTier and subscriptionStatus from database on initial sign in
          try {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:414',message:'jwt callback: Fetching user from DB',data:{userId:user.id},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { planTier: true, subscriptionStatus: true, academicIntegrityAcceptedAt: true },
            })
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:422',message:'jwt callback: DB user fetched',data:{foundUser:!!dbUser,planTier:dbUser?.planTier,subscriptionStatus:dbUser?.subscriptionStatus},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
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
            if (emailLower === "galaljobah@gmail.com") token.role = "ADMIN"
            else {
              const adminList = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
              if (adminList.includes(emailLower)) token.role = "ADMIN"
            }
          } catch (dbError: any) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:431',message:'jwt callback: DB fetch error',data:{errorMessage:dbError?.message,errorCode:dbError?.code},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
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
            if (emailLower === "galaljobah@gmail.com") token.role = "ADMIN"
            else {
              const adminList = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
              if (adminList.includes(emailLower)) token.role = "ADMIN"
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
          fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:450',message:'jwt callback: No user object (subsequent request)',data:{tokenSub:token.sub},timestamp:Date.now(),runId:'run1',hypothesisId:'F'})}).catch(()=>{});
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
        fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:461',message:'jwt callback: Returning token',data:{tokenSub:token.sub,tokenEmail:token.email,hasPlanTier:!!token.planTier},timestamp:Date.now(),runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        return token
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (process.env.NODE_ENV === "development") {
          console.error("[NextAuth] Error in jwt callback:", error)
        }
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:468',message:'jwt callback: Error caught, returning token anyway',data:{errorMessage,errorCode:error?.code,errorName:error?.name},timestamp:Date.now(),runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        // Return token even if there's an error
        return token
      }
    },
    async redirect({ url, baseUrl }) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:303',message:'redirect callback: Entry',data:{url,baseUrl,urlStartsWithBase:url.startsWith(baseUrl)},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // If callbackUrl is provided (e.g., from deep link checkout), use it
      // Otherwise, redirect to dashboard after successful authentication
      const redirectUrl = url.startsWith(baseUrl) ? url : `${baseUrl}/dashboard`
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:310',message:'redirect callback: Returning redirect URL',data:{redirectUrl,hasError:redirectUrl.includes('error=')},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      return redirectUrl
    },
  },
  pages: {
    signIn: "/", // Redirect to home page instead of separate login page
  },
  events: {
    async signIn({ account, profile, user }) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:537',message:'events.signIn: Entry',data:{hasUser:!!user,userId:user?.id,userEmail:user?.email,hasAccount:!!account,provider:account?.provider,hasAccessToken:!!account?.access_token,hasRefreshToken:!!account?.refresh_token},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
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
          fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:562',message:'events.signIn: Token saved successfully',data:{userId:user.id},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (process.env.NODE_ENV === "development") {
            console.error("[NextAuth] Error saving Google token in events (non-blocking):", error)
          }
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:570',message:'events.signIn: Token save error (non-blocking)',data:{errorMessage,userId:user?.id},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          // Don't throw - this is non-critical and won't affect OAuth flow
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:576',message:'events.signIn: Conditions not met',data:{hasUser:!!user,hasAccount:!!account,provider:account?.provider,hasAccessToken:!!account?.access_token,hasRefreshToken:!!account?.refresh_token,userId:user?.id},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
    },
    async createUser({ user }) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:580',message:'events.createUser: Triggered',data:{userId:user?.id,userEmail:user?.email},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    },
    async linkAccount({ account, user }) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:584',message:'events.linkAccount: Triggered',data:{userId:user?.id,provider:account?.provider,providerAccountId:account?.providerAccountId},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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


