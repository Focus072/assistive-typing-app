import "next-auth"
import { PlanTier } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      planTier?: PlanTier
      subscriptionStatus?: string | null
      role?: "ADMIN" | null
      academicIntegrityAcceptedAt?: Date | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    planTier?: PlanTier
    subscriptionStatus?: string | null
    role?: "ADMIN" | null
    academicIntegrityAcceptedAt?: Date | null
  }
}




