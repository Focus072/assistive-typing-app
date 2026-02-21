import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with password
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("Registration error:", error)

    // Provide more specific error messages
    const prismaError = error as { code?: string; message?: string }
    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    const errMsg = error instanceof Error ? error.message : String(error)
    if (errMsg?.includes('password')) {
      return NextResponse.json(
        { error: "Database schema error. Please contact support." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: errMsg || "Internal server error" },
      { status: 500 }
    )
  }
}


