import { z } from "zod"

const VALID_BADGES = ["Update", "Feature", "Fix", "Improvement"] as const

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  content: z.string().min(1, "Content is required").max(5000, "Content must be 5000 characters or less"),
  badge: z.enum(VALID_BADGES).default("Update"),
})

export const patchAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  badge: z.enum(VALID_BADGES).optional(),
  published: z.boolean().optional(),
})
