import { describe, it, expect } from "vitest"
import { createAnnouncementSchema } from "@/lib/schemas/announcements"

describe("createAnnouncementSchema", () => {
  it("accepts valid announcement with defaults", () => {
    const result = createAnnouncementSchema.safeParse({ title: "Hello", content: "World" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.badge).toBe("Update")
  })

  it("accepts all valid badge types", () => {
    for (const badge of ["Update", "Feature", "Fix", "Improvement"] as const) {
      const result = createAnnouncementSchema.safeParse({ title: "T", content: "C", badge })
      expect(result.success).toBe(true)
    }
  })

  it("rejects invalid badge", () => {
    const result = createAnnouncementSchema.safeParse({ title: "T", content: "C", badge: "Invalid" })
    expect(result.success).toBe(false)
  })

  it("rejects empty title", () => {
    const result = createAnnouncementSchema.safeParse({ title: "", content: "C" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors.title).toBeDefined()
  })

  it("rejects missing title", () => {
    const result = createAnnouncementSchema.safeParse({ content: "C" })
    expect(result.success).toBe(false)
  })

  it("rejects empty content", () => {
    const result = createAnnouncementSchema.safeParse({ title: "T", content: "" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors.content).toBeDefined()
  })

  it("rejects title over 200 chars", () => {
    const result = createAnnouncementSchema.safeParse({ title: "a".repeat(201), content: "C" })
    expect(result.success).toBe(false)
  })

  it("accepts title exactly 200 chars", () => {
    const result = createAnnouncementSchema.safeParse({ title: "a".repeat(200), content: "C" })
    expect(result.success).toBe(true)
  })

  it("rejects content over 5000 chars", () => {
    const result = createAnnouncementSchema.safeParse({ title: "T", content: "a".repeat(5001) })
    expect(result.success).toBe(false)
  })

  it("accepts content exactly 5000 chars", () => {
    const result = createAnnouncementSchema.safeParse({ title: "T", content: "a".repeat(5000) })
    expect(result.success).toBe(true)
  })
})
