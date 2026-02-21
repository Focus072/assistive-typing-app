import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

const setupSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// Map username to email
const getEmailFromUsername = (username: string): string => {
  if (username.includes("@")) {
    return username
  }
  return `${username}@gmail.com`
}

// This endpoint allows setting up an admin account with password
// Only works if the email is in ADMIN_EMAILS env variable
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = setupSchema.parse(body)

    // Convert username to email
    const email = getEmailFromUsername(username)

    if (!isAdminEmail(email)) {
      return NextResponse.json(
        { error: "Username is not authorized as admin" },
        { status: 403 }
      )
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (user) {
      // Update existing user with password
      const hashedPassword = await bcrypt.hash(password, 10)
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      })
      return NextResponse.json({
        message: "Admin password updated successfully",
      })
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 10)
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
        },
      })
      return NextResponse.json({
        message: "Admin account created successfully",
        userId: user.id,
      })
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Admin setup error:", error)
    return NextResponse.json(
      { error: "Failed to setup admin account" },
      { status: 500 }
    )
  }
}
