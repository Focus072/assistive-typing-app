/**
 * Promote an admin email to ADMIN tier in the database.
 * Reads the first email from ADMIN_EMAILS env var, or accepts one as an argument.
 * Run: npx tsx scripts/promote-admin.ts [email]
 * Or use Neon SQL Editor:
 *   UPDATE "User" SET "planTier" = 'ADMIN', "subscriptionStatus" = 'active'
 *   WHERE LOWER(email) = 'your-admin@example.com';
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const targetEmail = process.argv[2] || process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || ''
  if (!targetEmail) {
    console.error("[promote-admin] No email provided. Pass as argument or set ADMIN_EMAILS env var.")
    process.exit(1)
  }
  const result = await prisma.user.updateMany({
    where: {
      email: { equals: targetEmail, mode: "insensitive" },
    },
    data: {
      planTier: "ADMIN",
      subscriptionStatus: "active",
    },
  })
  console.log(`[promote-admin] Updated ${result.count} user(s) to ADMIN.`)
  if (result.count === 0) {
    console.log(`[promote-admin] No user with email ${targetEmail} found. Create the account first or run the SQL in Neon.`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
