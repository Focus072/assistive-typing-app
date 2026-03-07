import { prisma } from "@/lib/prisma"

/**
 * Log an admin action to the audit trail.
 * Fire-and-forget — never throws (logs errors silently).
 */
export async function logAudit(
  adminEmail: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminEmail,
        action,
        details: details ? JSON.stringify(details) : null,
      },
    })
  } catch {
    // Non-blocking: audit logging should never break the main operation
  }
}
