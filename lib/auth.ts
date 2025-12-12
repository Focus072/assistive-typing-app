// Suppress deprecation warnings early
import "./suppress-warnings"

import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { google } from "googleapis"

// Wrap PrismaAdapter to catch errors
let adapter: ReturnType<typeof PrismaAdapter>
try {
  adapter = PrismaAdapter(prisma)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:12',message:'PrismaAdapter created successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
} catch (error: any) {
  console.error("[NextAuth] PrismaAdapter creation error:", error)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:16',message:'PrismaAdapter creation failed',data:{errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  throw error
}

export const authOptions: NextAuthOptions = {
  // Use PrismaAdapter - it handles Account/Session creation automatically
  // We'll supplement it with manual token saving in events.signIn
  adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        // Only allow email/password login if user has a password set
        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
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
      // PrismaAdapter handles user/account creation automatically
      // Just log for debugging and always allow sign-in
      try {
        if (account?.provider === "google") {
          console.log("[NextAuth] Google OAuth signIn callback:", { 
            email: user?.email,
            userId: user?.id,
            hasAccessToken: !!account?.access_token,
            hasRefreshToken: !!account?.refresh_token,
            providerAccountId: account?.providerAccountId
          })
        }
        // Always return true - PrismaAdapter handles the rest
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:75',message:'signIn callback returning true',data:{userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return true
      } catch (error: any) {
        console.error("[NextAuth] Error in signIn callback:", error)
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
          
          // Log for debugging OAuth
          if (account?.provider === "google") {
            console.log("[NextAuth] JWT callback - Google OAuth:", {
              userId: user.id,
              email: user.email,
              hasAccount: !!account,
              hasAccessToken: !!account?.access_token
            })
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
        console.error("[NextAuth] Error in jwt callback:", error)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:114',message:'jwt callback error caught',data:{errorMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Return token even if there's an error
        return token
      }
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to dashboard after successful authentication
      // This prevents OAuthCallback errors from redirecting to login
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: "/login",
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
          console.log("[NextAuth] Google token saved successfully for user:", user.id)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error("[NextAuth] Error saving Google token in events (non-blocking):", error)
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
  },
  secret: process.env.NEXTAUTH_SECRET,
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


