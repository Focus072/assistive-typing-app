import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

const checkSchema = z.object({
  username: z.string().min(1, "Username is required"),
})

// Map username to email
const getEmailFromUsername = (username: string): string => {
  if (username.includes("@")) {
    return username
  }
  return `${username}@gmail.com`
}

// Check if an admin account exists and has a password set
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username } = checkSchema.parse(body)

    // Convert username to email
    const email = getEmailFromUsername(username)

    if (!isAdminEmail(email)) {
      return NextResponse.json({
        exists: false,
        hasPassword: false,
        isAdmin: false,
        message: "Username is not authorized as admin",
      })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
      },
    })

    if (!user) {
      return NextResponse.json({
        exists: false,
        hasPassword: false,
        isAdmin: true,
        message: "Account does not exist. Use /api/admin/setup to create it.",
      })
    }

    return NextResponse.json({
      exists: true,
      hasPassword: !!user.password,
      isAdmin: true,
      message: user.password
        ? "Account exists and has a password set. You can log in."
        : "Account exists but no password is set. Use /api/admin/setup to set a password.",
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Admin check error:", error)
    return NextResponse.json(
      { error: "Failed to check account", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
