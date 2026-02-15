/**
 * Promote galaljobah@gmail.com to ADMIN in the database.
 * Run once after schema has ADMIN tier: npx tsx scripts/promote-admin.ts
 * Or use Neon SQL Editor:
 *   UPDATE "User" SET "planTier" = 'ADMIN', "subscriptionStatus" = 'active'
 *   WHERE LOWER(email) = 'galaljobah@gmail.com';
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      email: { equals: "galaljobah@gmail.com", mode: "insensitive" },
    },
    data: {
      planTier: "ADMIN",
      subscriptionStatus: "active",
    },
  })
  console.log(`[promote-admin] Updated ${result.count} user(s) to ADMIN.`)
  if (result.count === 0) {
    console.log("[promote-admin] No user with email galaljobah@gmail.com found. Create the account first or run the SQL in Neon.")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
