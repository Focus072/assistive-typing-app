import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { google } from "googleapis"

export const authOptions: NextAuthOptions = {
  // Use PrismaAdapter for user management, but JWT for sessions
  adapter: PrismaAdapter(prisma),
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
          scope: process.env.GOOGLE_DOCS_SCOPES || "https://www.googleapis.com/auth/documents",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Always allow sign in - PrismaAdapter will create user if needed
      // Token storage happens in jwt callback after user is created
      return true
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
      // Initial sign in - user is available
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      
      // Store Google OAuth tokens after user is created (on first sign in)
      if (account?.provider === "google" && account.access_token && account.refresh_token && user?.id) {
        try {
          const expiresAt = account.expires_at
            ? new Date(account.expires_at * 1000)
            : new Date(Date.now() + 3600 * 1000)

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
          console.error("Error saving Google token:", error)
          // Don't fail the sign-in if token save fails
        }
      }
      
      return token
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects properly
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: "/login",
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


