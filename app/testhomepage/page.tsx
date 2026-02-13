import { redirect } from "next/navigation"

export default function TestHomepage() {
  // Redirect to root since content is now at /
  redirect("/")
}
