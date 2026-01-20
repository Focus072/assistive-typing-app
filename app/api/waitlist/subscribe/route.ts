import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = subscribeSchema.parse(body)

    // Check if email already exists
    const existing = await prisma.waitlistEmail.findUnique({
      where: { email: validated.email },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Create waitlist entry
    await prisma.waitlistEmail.create({
      data: {
        email: validated.email,
      },
    })

    return NextResponse.json(
      { message: "Successfully added to waitlist" },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    if (error.code === "P2002") {
      // Unique constraint violation
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    if (process.env.NODE_ENV === "development") {
      console.error("Waitlist subscription error:", error)
    }

    return NextResponse.json(
      { error: "Failed to subscribe to waitlist" },
      { status: 500 }
    )
  }
}
