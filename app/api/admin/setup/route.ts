import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

export const dynamic = "force-dynamic"

const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// This endpoint allows setting up an admin account with password
// Only works if the email is in ADMIN_EMAILS env variable
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = setupSchema.parse(body)

    // Check if email is in admin emails
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || []
    if (!adminEmails.includes(email)) {
      return NextResponse.json(
        { error: "Email is not authorized as admin" },
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
  } catch (error: any) {
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
