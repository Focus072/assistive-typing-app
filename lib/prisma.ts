import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use DATABASE_URL or fallback to storage_DATABASE_URL (Vercel Storage integration)
const databaseUrl = process.env.DATABASE_URL || process.env.storage_DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL or storage_DATABASE_URL environment variable is required")
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma


